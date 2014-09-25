/**
 * @jsx React.DOM
 */
'use strict';

var React        = require('react/addons');
var transitionTo = require('react-router').transitionTo;

var TracklistControlBar = require('../components/TracklistControlBar');
var Tracklist           = require('../components/Tracklist');
var SearchBar           = require('../components/SearchBar');
var SearchAPI           = require('../utils/SearchAPI');

var SearchPage = React.createClass({

  statics: {
    willTransitionFrom: function(transition, component) {
      // If being redirected back to the same page, update query
      if ( /search/i.test(transition.path) ) {
        // Manually grab new search query from URL
        component.setState({
          query: transition.path.split('/')[2].replace(/(\+)|(%20)/gi, ' '),
          isSearching: true,
          results: null
        }, function() {
          component.componentDidMount();
        });
      }
    }
  },

  getInitialState: function() {
    return {
      query: this.props.params.query.replace(/(\+)|(%20)/gi, ' '),
      isSearching: this.props.params.query.length ? true : false,
      results: null
    };
  },

  componentDidMount: function() {
    this.props.updateHeader({
      title: 'Search Music',
      icon: 'fa-search'
    });

    if ( this.state.query.length ) {
      SearchAPI.get(this.state.query).then(function(data) {
        this.doneSearching(data);
      }.bind(this), function(err) {
        console.log('error:', err);
      });
    }
  },

  doneSearching: function(data) {
    this.setState({
      isSearching: false,
      results: data
    });
  },

  updateQuery: function(evt) {
    this.setState({
      query: evt.target.value
    });
  },

  submitOnEnter: function(evt) {
    var keyCode = evt.keyCode || evt.which;

    if ( keyCode === '13' || keyCode === 13 ) {
      this.doSearch();
    }
  },

  doSearch: function() {
    transitionTo('search', { query: this.state.query });
  },

  renderLoadingIndicator: function() {
    var element = null;

    if ( this.state.isSearching ) {
      element = (
        <h1>Searching...</h1>
      );
    }

    return element;
  },

  renderResults: function() {
    var results = null;

    if ( this.state.results && !this.state.isSearching ) {
      results = (
        <Tracklist tracks={this.state.results}
                   selectTrack={this.props.selectTrack}
                   currentTrack={this.props.currentTrack} />
      );
    }

    return results;
  },

  render: function() {
    return (
      <section className="content">
        <TracklistControlBar type="search">
          <div className="search-container">
            <SearchBar ref="SearchBar"
                       value={this.state.query}
                       onChange={this.updateQuery}
                       onKeyPress={this.submitOnEnter}
                       placeholder="Search all music..." />
          </div>
          <div className="options-container">
          </div>
        </TracklistControlBar>
        {this.renderLoadingIndicator()}
        {this.renderResults()}
      </section>
    );
  }

});

module.exports = SearchPage;