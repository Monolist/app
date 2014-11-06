'use strict';

var Reflux               = require('reflux');

var GlobalActions        = require('../actions/GlobalActions');
var PlaylistActions      = require('../actions/PlaylistActions');
var CurrentUserStore     = require('./CurrentUserStore');
var CurrentPlaylistStore = require('./CurrentPlaylistStore');
var UserAPI              = require('../utils/UserAPI');
var PlaylistAPI          = require('../utils/PlaylistAPI');

var UserCollaborationsStore = Reflux.createStore({

  init: function() {
    this.listenTo(GlobalActions.loadUserCollaborations, this.loadCurrentUserCollaborations);
    this.listenTo(PlaylistActions.create, this.createPlaylist);
    this.listenTo(PlaylistActions.addTrack, this.addTrackToPlaylist);
    this.listenTo(PlaylistActions.delete, this.deletePlaylist);
  },

  loadCurrentUserCollaborations: function(cb) {
    cb = cb || function() {};

    console.log('load for:', CurrentUserStore.user.id);

    UserAPI.getCollaborations(CurrentUserStore.user.id).then(function(playlists) {
      this.currentUserCollaborations = playlists;
      this.trigger(playlists);
      cb(playlists);
    }.bind(this));
  },

  createPlaylist: function(playlist, cb) {
    cb = cb || function() {};

    console.log('create playlist, user ID:', CurrentUserStore.user.id);

    playlist.creator_id = CurrentUserStore.user.id;

    PlaylistAPI.create(playlist).then(function(createdPlaylist) {
      cb(createdPlaylist);
      this.loadUserCollaborations(CurrentUserStore.user.id);
    }.bind(this));
  },

  addTrackToPlaylist: function(playlist, track, cb) {
    cb = cb || function() {};

    console.log('add track to playlist');

    track.creator_id = CurrentUserStore.user.id;
    track.playlist_id = playlist.id;

    PlaylistAPI.addTrack(playlist.id, track).then(function(modifiedPlaylist) {
      cb(modifiedPlaylist);

      // Update play queue if changing current playlist
      if ( CurrentPlaylistStore.playlist.id === modifiedPlaylist.id ) {
        PlaylistActions.play(modifiedPlaylist);
      }

      this.loadUserCollaborations(cb);
    }.bind(this));
  },

  deletePlaylist: function(playlistId, cb) {
    cb = cb || function() {};

    console.log('delete from collaborations');

    PlaylistAPI.delete(playlistId).then(function() {
      GlobalActions.loadUserCollaborations();
    }.bind(this));
  }

});

module.exports = UserCollaborationsStore;