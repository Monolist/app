'use strict';

var when = require('when');

/* ====================================================== */

module.exports = function(models) {

  var createUser = function() {
    var deferred = when.defer();
    var user = {
      username: 'jakemmarsh',
      email: 'jakemmarsh@gmail.com',
      imageUrl: 'https://monolist.s3.amazonaws.com/user_imgs/2014/12/c4e4a0e8c60dc51f40e8-1.png',
      hash: 'kenneth',
      role: 'admin'
    };

    models.User.create(user).then(function(createdUser) {
      deferred.resolve(createdUser);
    }).catch(function(err) {
      console.log('error creating user:', err);
    });

    return deferred.promise;
  };

  var createPlaylist = function() {
    var deferred = when.defer();
    var playlist = {
      UserId: 1,
      title: 'Test Playlist',
      imageUrl: 'https://s3.amazonaws.com/monolist/playlist_imgs/2014/12/16d056437a0acdbe4830-1.png',
      privacy: 'public'
    };

    models.Playlist.create(playlist).then(function(createdPlaylist) {
      deferred.resolve(createdPlaylist);
    }).catch(function(err) {
      console.log('error creating playlist:', err);
    });

    return deferred.promise;
  };

  var createPlaylistLike = function() {
    var deferred = when.defer();
    var like = {
      UserId: 1,
      PlaylistId: 1
    };

    models.PlaylistLike.create(like).then(function(createdLike) {
      deferred.resolve(createdLike);
    }).catch(function(err) {
      console.log('error creating like:', err);
    });

    return deferred.promise;
  };

  var createSecondPlaylist = function() {
    var deferred = when.defer();
    var playlist = {
      UserId: 1,
      title: 'Second Playlist That Is Private',
      privacy: 'private'
    };

    models.Playlist.create(playlist).then(function(createdPlaylist) {
      deferred.resolve(createdPlaylist);
    }).catch(function(err) {
      console.log('error creating second playlist:', err);
    });

    return deferred.promise;
  };

  createUser()
  .then(createPlaylist)
  .then(createPlaylistLike)
  .then(createSecondPlaylist);

};