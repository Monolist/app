'use strict';

import ViewingRecentlyPlayedStore from '../../app/js/stores/ViewingRecentlyPlayedStore'; // eslint-disable-line no-unused-vars
import GlobalActions              from '../../app/js/actions/GlobalActions';
import PlaylistAPI                from '../../app/js/utils/PlaylistAPI';

describe('Store: ViewingRecentlyPlayed', function() {

  it('should load recent playlist searches on action', function(done) {
    const getRecentlyPlayedStub = sandbox.stub(PlaylistAPI, 'getRecentlyPlayed').resolves();

    GlobalActions.loadExploreRecentlyPlayed(() => {
      sinon.assert.calledOnce(getRecentlyPlayedStub);
      done();
    });
  });

});
