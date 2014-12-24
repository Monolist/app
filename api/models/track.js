'use strict';

module.exports = function(sequelize, DataTypes) {

  var Track = sequelize.define('Track', {
    title:       { type: DataTypes.STRING, allowNull: false },
    artist:      { type: DataTypes.STRING },
    source:      { type: DataTypes.ENUM('soundcloud', 'bandcamp', 'youtube', 'spotify'), allowNull: false },
    sourceParam: { type: DataTypes.STRING, allowNull: false },
    sourceUrl:   {
      type: DataTypes.STRING,
      validate: {
        isUrl: true
      }
    },
    imageUrl:    { type: DataTypes.STRING }
  },
  {
    classMethods: {
      associate: function(models) {
        Track.belongsTo(models.User);
        Track.belongsTo(models.Playlist);
        Track.hasMany(models.TrackDownvote, { as: 'Downvotes', onDelete: 'cascade' });
        Track.hasMany(models.TrackUpvote, { as: 'Upvotes', onDelete: 'cascade' });
        Track.hasMany(models.TrackComment, { as: 'Comments', onDelete: 'cascade' });
        Track.hasMany(models.TrackPlay, { as: 'Plays', onDelete: 'cascade' });
        Track.hasMany(models.TrackStar, { as: 'Stars', foreignKey: 'TrackId', onDelete: 'cascade' });
      }
    }
  });

  return Track;

};