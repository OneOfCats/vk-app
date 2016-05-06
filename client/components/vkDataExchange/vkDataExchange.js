app.factory('vkDataExchange', function($timeout, $q){
  var self = this;

  self.getPublics = function getPublics(id, outArray){
    outArray.length = 0;
    var downloadedEvent = $q.defer();
    var offset = 0;
    queryPublics(offset);
    return downloadedEvent;

    function queryPublics(offset){
      return VK.Api.call('users.getSubscriptions', {user_id: id, extended: 1, count: 200, offset: offset, v: 5.44}, function(r){
        if(!r || !r.response){
          queryPublics(offset);
          return;
        } 
        if(r.response.items.length == 0){
          downloadedEvent.resolve();
          return;
        }
        for(var i = 0; i < r.response.items.length; i++){
          outArray.push(r.response.items[i]);
        }
        offset = outArray.length;
        queryPublics(offset);
      });
    }
  };

  self.get1000Subscribers = function get1000Subscribers(publicId, subscribersObj){
    return VK.Api.call('groups.getMembers', {group_id: publicId, offset: subscribersObj.loaded, fields: 'sex, city, country, photo_100', v: 5.44}, function(r){
        if(!r || !r.response){ //If error
          subscribersObj.load1000.reject('no-response');
          return; 
        }
        subscribersObj.total = r.response.count;
        if(r.response.items.length == 0){ //When we are done
          subscribersObj.totalLoad.resolve(publicId); //resolving promise of total loading (everybody is loaded)
          return;
        }
        for(var i = 0; i < r.response.items.length; i++){
          subscribersObj.items.push(r.response.items[i]);
        }
        subscribersObj.loaded += r.response.items.length;
        subscribersObj.load1000.resolve(publicId); //Loading of these 1000 subscribers is done
      });
  };

  return this;
});