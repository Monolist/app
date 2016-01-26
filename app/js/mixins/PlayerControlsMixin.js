/* global YT */
'use strict';

import Audio5js             from '../../../node_modules/audio5/audio5';
import PlaybackQueue        from 'playback-queue';
import {ListenerMixin}      from 'reflux';

import $                    from 'jquery';
import _                    from 'lodash';

import CurrentTrackStore    from '../stores/CurrentTrackStore';
import TrackActions         from '../actions/TrackActions';
import CurrentPlaylistStore from '../stores/CurrentPlaylistStore';
import APIUtils             from '../utils/APIUtils';
import LocalStorage         from '../utils/LocalStorage';

var PlayerControlsMixin = {

  mixins: [ListenerMixin],

  player: null,

  audio: null,

  ytPlayer: null,

  getInitialState() {
    return {
      repeat: LocalStorage.get('repeat') || 'playlist',
      shuffle: LocalStorage.get('shuffle') === 'true' || false,
      volume: parseFloat(LocalStorage.get('volume')) || 0.7,
      time: 0,
      duration: 0,
      paused: true,
      track: null,
      error: null
    };
  },

  componentDidMount() {
    $(document).keydown(this.handleGlobalKeyPress);
    this.listenTo(CurrentTrackStore, this.selectTrack);
    this.listenTo(CurrentPlaylistStore, this.selectPlaylist);

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
  },

  handleGlobalKeyPress(evt) {
    let keyCode = evt.keyCode || evt.which;
    let $focusedElement = $(':focus');
    let isInInput = $focusedElement.is('textarea') || $focusedElement.is('input');
    let isControlKey = (keyCode === 32 || keyCode === 37 || keyCode === 39);

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
    let component = this;

    this.player = new Audio5js({
      swf_path: 'node_modules/audio5/swf/audio5js.swf', // eslint-disable-line camelcase
      codecs: ['mp3', 'mp4', 'wav', 'webm'],
      use_flash: true, // eslint-disable-line camelcase
      format_time: false, // eslint-disable-line camelcase
      ready: function() {
        this.on('timeupdate', component.updateProgress);
        this.on('error', (error) => { });
        this.on('ended', component.nextTrack);
        this.audio.volume(component.state.volume);
      }
    });
    this.audio = this.player.audio;
  },

  initYtPlayer(videoId) {
    let component = this;

    this.ytPlayer = new YT.Player('yt-player', {
      height: '100',
      width: '150',
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
        onReady: function(evt) {
          evt.target.setVolume(component.state.volume * 100);
        },
        onStateChange: function(evt) {
          if ( evt.data === YT.PlayerState.ENDED ) {
            component.nextTrack();
          } else if ( evt.data === YT.PlayerState.PAUSED && component.state.paused !== true ) {
            component.setState({ paused: true });
          } else if ( evt.data === YT.PlayerState.PLAYING && component.state.paused !== false ) {
            component.setState({ paused: false });
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

  seekTrack(newTime = 0) {
    this.setState({ time: newTime }, () => {
      if (this.state.track.source === 'youtube' ) {
        this.ytPlayer.seekTo(newTime);
      } else {
        this.player.seek(newTime);
      }
    });
  },

  updateVolume(newVolume = 0.7) {
    this.setState({ volume: newVolume }, () => {
      if ( !_.isEmpty(this.state.track) ) {
        if ( this.state.track.source === 'youtube' ) {
          this.ytPlayer.setVolume(newVolume * 100);
        } else {
          this.audio.volume(newVolume);
        }
      }

      LocalStorage.set('volume', this.state.volume);
    });
  },

  transitionToNewTrack() {
    let progressInterval;

    if ( this.state.track ) {
      if ( this.state.track.source === 'youtube' ) {
        if ( _.isEmpty(this.ytPlayer) ) {
          this.initYtPlayer(this.state.track.sourceParam);
        } else {
          this.ytPlayer.loadVideoById(this.state.track.sourceParam);
        }
        this.setState({ paused: false });
        progressInterval = setInterval(this.updateProgress, 500);
      } else {
        this.player.load(APIUtils.getStreamUrl(this.state.track));
        this.playTrack();
        clearInterval(progressInterval);
      }
    }
  },

  previousTrack() {
    if ( !_.isEmpty(this.state.playlist) ) {
      // If past the beginning of a song, just rewind
      if ( this.audio.position > 20 ) {
        this.seekTrack(0);
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

  selectTrack(track) {
    this.pauseTrack(() => {
      this.setState({
        track: track,
        time: 0,
        duration: !_.isEmpty(track) ? track.duration : 0
      }, this.transitionToNewTrack);
    });
  },

  selectPlaylist(newPlaylist) {
    // Ensure structure is correct
    if ( !newPlaylist.tracks ) {
      newPlaylist = {
        tracks: newPlaylist
      };
    }

    this.playbackQueue.setTracks(newPlaylist.tracks);

    this.setState({
      playlist: newPlaylist
    });
  },

  sortPlaylist(key) {
    if ( this.state.playlist && this.state.playlist.tracks ) {
      const sortedTracks = _.sortBy(this.state.playlist.tracks, (track) => {
        return track[key];
      });
      let playlistCopy = this.state.playlist;

      playlistCopy.tracks = sortedTracks;

      this.setState({
        playlist: playlistCopy
      });
    }
  },

  pauseTrack(cb = function(){}) {
    this.setState({ paused: true }, () => {
      if ( this.state.track ) {
        if ( this.state.track.source === 'youtube' ) {
          this.ytPlayer.pauseVideo();
        } else {
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
      LocalStorage.set('repeat', this.state.repeat);
    });
  },

  toggleShuffle() {
    this.playbackQueue.toggleShuffle();

    this.setState({ shuffle: this.playbackQueue.isShuffled }, () => {
      LocalStorage.set('shuffle', this.state.shuffle);
    });
  }

};

export default PlayerControlsMixin;
