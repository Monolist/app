/* global YT */
'use strict';

import Audio5js             from '../../../node_modules/audio5/audio5';
import PlaybackQueue        from 'playback-queue';
import {ListenerMixin}      from 'reflux';
import lscache              from 'lscache';
import _                    from 'lodash';

import CurrentTrackStore    from '../stores/CurrentTrackStore';
import TrackActions         from '../actions/TrackActions';
import CurrentPlaylistStore from '../stores/CurrentPlaylistStore';
import PlaybackStore        from '../stores/PlaybackStore';
import APIUtils             from '../utils/APIUtils';
import Modals               from '../utils/Modals';

const PlayerControlsMixin = {

  mixins: [ListenerMixin],

  player: null,

  audio: null,

  ytPlayer: null,

  getInitialState() {
    const cachedVolume = parseFloat(lscache.get('volume'));

    return {
      repeat: lscache.get('repeat') || 'playlist',
      shuffle: lscache.get('shuffle') || false,
      volume: isNaN(cachedVolume) ?  0.7 : cachedVolume,
      time: 0,
      duration: 0,
      paused: true,
      buffering: false,
      track: null,
      error: null
    };
  },

  handlePlaybackUpdate(eventType, ...args) {
    switch( eventType ) {
      case 'updateVolume':
        this.updateVolume(args[0]);
        break;
      case 'seek':
        this.seek(args[0]);
        break;
      case 'previousTrack':
        this.previousTrack();
        break;
      case 'nextTrack':
        this.nextTrack();
        break;
      case 'togglePlay':
        this.togglePlay();
        break;
      case 'toggleRepeat':
      this.toggleRepeat();
        break;
      case 'toggleShuffle':
        this.toggleShuffle();
        break;
      case 'sortPlaylist':
        this.sortPlaylist(args[0], args[1]);
        break;
    }
  },

  componentDidMount() {
    document.addEventListener('keydown', this.handleGlobalKeyPress);

    this.listenTo(CurrentTrackStore, this.updateCurrentTrack);
    this.listenTo(CurrentPlaylistStore, this.selectPlaylist);
    this.listenTo(PlaybackStore, this.handlePlaybackUpdate);

    this.playbackQueue = new PlaybackQueue({
      repeat: this.state.repeat,
      shuffle: this.state.shuffle
    });

    this.initPlayer();
  },

  componentWillUnmount() {
    // Attempt to destroy HTML5 player
    if ( !_.isEmpty(this.player) ) { try { this.player.destroy(); } catch(e) {} }
    // Attempt to destroy YouTube player
    if ( !_.isEmpty(this.ytPlayer) ) { try { this.ytPlayer.destroy(); } catch(e) {} }

    document.removeEventListener('keydown', this.handleGlobalKeyPress);
  },

  handleGlobalKeyPress(evt) {
    const keyCode = evt.keyCode || evt.which;
    const focusedElement = document.activeElement;
    const tagName = focusedElement.tagName.toLowerCase();
    const isInInput = tagName === 'textarea' || tagName === 'input';
    const isControlKey = (keyCode === 32 || keyCode === 37 || keyCode === 39);

    // Only use global actions if user isn't in an input or textarea
    if ( !isInInput && isControlKey ) {
      evt.stopPropagation();
      evt.preventDefault();

      switch( keyCode ) {
        case 32: // Space bar
          this.togglePlay();
          break;
        case 37: // Left arrow
          this.previousTrack();
          break;
        case 39: // Right arrow
          this.nextTrack();
          break;
      }
    }
  },

  initPlayer() {
    const component = this;

    try {
      this.player = new Audio5js({
        swf_path: 'node_modules/audio5/swf/audio5js.swf', // eslint-disable-line camelcase
        codecs: ['mp3', 'mp4', 'wav', 'webm'],
        use_flash: true, // eslint-disable-line camelcase,
        throw_errors: false, // eslint-disable-line camelcase
        format_time: false, // eslint-disable-line camelcase
        ready: function() {
          this.on('canplay', () => { component.setState({ buffering: false }); });
          this.on('timeupdate', component.updateProgress);
          this.on('error', (err) => {
            if ( err.message.toLowerCase().indexOf('failed to load') > -1 ) {
              Modals.openAudioPlayerError(
                component.state.track,
                component.state.playlist,
                component.props.currentUser
              );
            }
          });
          this.on('ended', component.nextTrack);
          this.audio.volume(component.state.volume);
        }
      });

      this.audio = this.player.audio;
    } catch(e) {
      if ( e.toString().toLowerCase().indexOf('flash') > -1 ) {
        Modals.openFlashError();
      }
    }
  },

  initYtPlayer(videoId) {
    const component = this;

    this.ytPlayer = new YT.Player('yt-player', {
      height: '140',
      width: '200',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        disablekb: 1,
        fs: 0,
        showinfo: 0,
        autohide: 1,
        iv_load_policy: 3 // eslint-disable-line camelcase
      },
      events: {
        onReady(evt) {
          evt.target.setVolume(component.state.volume * 100);
        },
        onError(evt) {
          Modals.openYouTubeError(evt.data, component.state.track, component.state.playlist, component.props.currentUser);
        },
        onStateChange(evt) {
          if ( evt.data === YT.PlayerState.ENDED ) {
            component.nextTrack();
          } else if ( evt.data === YT.PlayerState.BUFFERING && component.state.buffering === false ) {
            component.setState({ buffering: true });
          } else if ( component.state.buffering === true ) {
            component.setState({ buffering: false });
          }
        }
      }
    });
  },

  updateProgress(position) {
    if ( this.state.track && this.state.track.source === 'youtube' ) {
      position = this.ytPlayer.getCurrentTime ? this.ytPlayer.getCurrentTime() : 0;
    }

    if ( !isNaN(position) ) {
      this.setState({ time: position });
    }
  },

  seek(newTime) {
    if ( this.state.track ) {
      this.setState({ time: newTime }, () => {
        if (this.state.track.source === 'youtube' ) {
          this.ytPlayer.seekTo(newTime);
        } else {
          this.player.seek(newTime);
        }
      });
    }
  },

  updateVolume(newVolume) {
    this.setState({ volume: newVolume }, () => {
      if ( !_.isEmpty(this.state.track) ) {
        if ( this.state.track.source === 'youtube' ) {
          this.ytPlayer.setVolume(newVolume * 100);
        } else {
          this.audio.volume(newVolume);
        }
      }

      lscache.set('volume', this.state.volume);
    });
  },

  transitionToNewTrack() {
    let progressInterval;

    if ( this.state.track ) {
      lscache.set('track', this.state.track);
      if ( this.state.track.source === 'youtube' ) {
        if ( _.isEmpty(this.ytPlayer) ) {
          this.initYtPlayer(this.state.track.sourceParam);
        } else {
          this.ytPlayer.loadVideoById(this.state.track.sourceParam);
        }
        this.setState({ paused: false });
        progressInterval = setInterval(this.updateProgress, 500);
      } else if ( this.player ) {
        this.player.load(APIUtils.getStreamUrl(this.state.track));
        this.playTrack();
        clearInterval(progressInterval);
      } else {
        Modals.openFlashError();
      }
    }
  },

  previousTrack() {
    const shouldRestartAudio = this.state.track.source !== 'youtube' && this.audio.position > 15;
    const shouldRestartYoutube = this.state.track.source === 'youtube' && this.ytPlayer.getCurrentTime() > 15;

    if ( !_.isEmpty(this.state.playlist) ) {
      // If past the beginning of a song, just rewind
      if ( shouldRestartAudio || shouldRestartYoutube ) {
        this.seek(0);
      } else {
        this.pauseTrack(() => {
          this.playbackQueue.previousTrack();
          this.setState({
            track: this.playbackQueue.currentTrack
          }, this.transitionToNewTrack);
        });
      }
    }
  },

  nextTrack() {
    if ( !_.isEmpty(this.state.playlist) ) {
      this.pauseTrack();

      this.playbackQueue.nextTrack();

      TrackActions.select(this.playbackQueue.currentTrack);
    }
  },

  updateCurrentTrack(track) {
    const isNewTrack = !_.isEqual(this.state.track, track);

    if ( isNewTrack ) {
      this.pauseTrack(() => {
        this.setState({
          track: track,
          time: 0,
          duration: !_.isEmpty(track) ? track.duration : 0,
          buffering: track.source === 'youtube' ? true : !!this.player
        }, this.transitionToNewTrack);
      });
    } else {
      this.setState({
        track: track
      });
    }
  },

  selectPlaylist(newPlaylist) {
    if ( newPlaylist ) {
      // Ensure structure is correct
      if ( _.isArray(newPlaylist) && !newPlaylist.tracks ) {
        newPlaylist = {
          tracks: newPlaylist
        };
      }

      lscache.set('playlist', newPlaylist);
      this.playbackQueue.setTracks(newPlaylist.tracks);

      this.setState({
        playlist: newPlaylist
      });
    }
  },

  sortPlaylist(key, asc) {
    this.playbackQueue.sortTracks(key, asc);
  },

  pauseTrack(cb = function(){}) {
    this.setState({ paused: true }, () => {
      if ( this.state.track ) {
        if ( this.state.track.source === 'youtube' ) {
          this.ytPlayer.pauseVideo();
        } else if ( this.audio ) {
          this.audio.pause();
        }
      }
      cb();
    });
  },

  playTrack() {
    if ( this.state.track ) {
      this.setState({ paused: false }, () => {
        if ( this.state.track.source === 'youtube' ) {
          this.ytPlayer.playVideo();
        } else {
          this.player.play();
        }
      });
    }
  },

  togglePlay() {
    if ( !this.state.track && !_.isEmpty(this.state.playlist) ) {
      this.nextTrack();
    }

    if ( this.state.paused ) {
      this.playTrack();
    } else {
      this.pauseTrack();
    }
  },

  toggleRepeat() {
    this.playbackQueue.toggleRepeat();

    this.setState({ repeat: this.playbackQueue.repeatState }, () => {
      lscache.set('repeat', this.state.repeat);
    });
  },

  toggleShuffle() {
    this.playbackQueue.toggleShuffle();

    this.setState({ shuffle: this.playbackQueue.isShuffled }, () => {
      lscache.set('shuffle', this.state.shuffle);
    });
  }

};

export default PlayerControlsMixin;
