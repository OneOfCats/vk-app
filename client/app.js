var app = angular.module('friendsSearchApp', []);

app.controller('friendsAppCtrl', ['$scope', 'vkDataExchange', '$q', '$http', function($scope, vkDataExchange, $q, $http){
  var self = this;

  self.userVkId = 0; //user's vk id
  self.userPublics = new Array(); //user's publics (subscriptions)
  self.publicsForSearch = new Array();
  self.commonSubscribers = new Array(); //Common subscribers on choosen publics
  self.countriesList = [{id: 0, title: 'Любая страна'}];
  self.citiesList = [{id: 0, title: 'Любой город'}];
  self.country = self.countriesList[0];
  self.city = self.citiesList[0];
  getCountries();

  self.getCities = function getCities(cityName){
    console.log('getCities');
    if(self.country.id == 0){
      $scope.$apply(function(){
        self.citiesList = [{id: 0, title: 'Любой город'}];
      });
      return;
    }
    parseCities();

    function parseCities(){
      VK.Api.call('database.getCities', {need_all: cityName.length == 0 ? 0 : 1, country_id: self.country.id, q: cityName, count: 5, v: 5.44}, function(r){
        if(!r.response){
          parseCities(); //If error - try again
          return;
        }
        self.citiesList = cityName.length == 0 ? [{id: 0, title: 'Любой город'}] : [];
        $scope.$apply(function(){
          for(var i = 0; i < r.response.items.length; i++){
            self.citiesList.push(r.response.items[i]);
          }
          self.city = self.citiesList[0];
        });
      });
    }
  };

  function getCountries(){
    console.log('getCountries');
    VK.Api.call('database.getCountries', {need_all: 0, count: 5, v: 5.44}, function(r){
      if(!r.response){
        getCountries();
        return;
      }
      $scope.$apply(function(){
        for(var i = 0; i < r.response.items.length; i++){
          self.countriesList.push(r.response.items[i]);
        }
      });
    });
  };

  $scope.$watch('ctrl.country.id', function(current, old){
    if(current == 0){ //Any country
      self.citiesList = [{id: 0, title: 'Любой город'}]; //Then any city
    }else{ 
      self.getCities(''); //Get cities by country
    }
  });

  self.findUserPublics = function findUserPublics(){
    var Publics = [];
    var downloadedPromise = vkDataExchange.getPublics(self.userVkId, Publics);
    downloadedPromise.promise.then(function(){
      self.userPublics = Publics;
    });
  };

  self.addSelectedPublic = function addSelectedPublic(index){
    var public = self.userPublics[index];
    var i = self.publicsForSearch.indexOf(public);
    if(i != -1){ //Find out if we already added this public to search list
      self.publicsForSearch.splice(i, 1); //If found - it means checkbox is pressed again (unchecked), so delete this public
      return;
    }

    $http.get('/publics/' + public.id + '/updated') //Get the date when subscribers DB was updated last time
      .success(function(data){
        public.updated = new Date(data);
      })
      .error(function(data){
        console.log('HTTP get public update date error: ' + data);
      });

    self.publicsForSearch.push(public);
  };

  self.findSubscribers = function findSubscribers(){

    loadSubscribers(0);

    function loadSubscribers(index){ //takes public index in search publics array
      if(self.publicsForSearch[index] === undefined){ //Get common subscribers and exit if all publics have been searched
        self.commonSubscribers = self.getCommonSubscribers();
      }
      else if(self.publicsForSearch[index].subscribers !== undefined){ //Go to the next public if we already have this public's subscribers
        loadSubscribers(++index);
      }
      else if(self.publicsForSearch[index].getFromDb == true){ //If user want to download subscribers fast from DB
        $http.get('/publics/' + self.publicsForSearch[index].id + '/subscribers')
          .success(function(data){
            self.publicsForSearch[index].subscribers = {};
            self.publicsForSearch[index].subscribers.items = data;
            for(var i = 0; i < self.publicsForSearch[index].subscribers.items.length; i++){
              if(self.publicsForSearch[index].subscribers.items[i].country != 'undefined'){
                self.publicsForSearch[index].subscribers.items[i].country = JSON.parse(self.publicsForSearch[index].subscribers.items[i].country);
              }else{
                self.publicsForSearch[index].subscribers.items[i].country = undefined;
              }
              if(self.publicsForSearch[index].subscribers.items[i].city != 'undefined'){
                self.publicsForSearch[index].subscribers.items[i].city = JSON.parse(self.publicsForSearch[index].subscribers.items[i].city);
              }else{
                self.publicsForSearch[index].subscribers.items[i].city = undefined;
              }
            }
            self.publicsForSearch[index].updated = new Date();
            loadSubscribers(++index);
          })
          .error(function(data){
            console.log('HTTP get public subscribers error: ' + data);
            loadSubscribers(++index);
          });
      }
      else{ //or load subscribers from VK
        self.publicsForSearch[index].subscribers = {loaded: 0, total: 0, items: new Array(), totalLoad: $q.defer()};
        loadNext1000Func(index, 0);
        self.publicsForSearch[index].subscribers.totalLoad.promise.then(function(){ //When all subscribers of this public are downloaded
          self.publicsForSearch[index].updated = new Date();
          delete self.publicsForSearch[index].totalLoad;
          delete self.publicsForSearch[index].load1000;
          $http.post('/publics/' + self.publicsForSearch[index].id + '/subscribers', self.publicsForSearch[index]) //Send subscribers to the server
            .success(function(data){
              console.log('Public ' + data + ' is downloaded to DB');
            })
            .error(function(data){
              console.log('HTTP post public ' + data + ' download to DB error: ' + data);
            });
          loadSubscribers(++index);
        });
      }

      function loadNext1000Func(index, iteration){
        self.publicsForSearch[index].subscribers.load1000 = $q.defer();
        vkDataExchange.get1000Subscribers(self.publicsForSearch[index].id, self.publicsForSearch[index].subscribers);
        self.publicsForSearch[index].subscribers.load1000.promise.then(function(){
          if(iteration > 300){ //To prevent stack overflow, use $timeout
            $timeout(function(){loadNext1000Func(index, 0)});
          }else{
            loadNext1000Func(index, ++iteration)
          }
        }, function(error){ //If error - try again
          if(iteration > 300){
            $timeout(function(){loadNext1000Func(index, 0)});
          }else{
            loadNext1000Func(index, ++iteration)
          }
        });
      }
    }
  };

  self.getCommonSubscribers = function getCommonSubscribers(){
    var outArray = new Array();
    var minSubscribersPublicIndex = 0;
    var min = self.publicsForSearch[0].subscribers.items.length;
    for(var i = 1; i < self.publicsForSearch.length; i++){
      if(self.publicsForSearch[i].subscribers.items.length < min){
        min = self.publicsForSearch[i].subscribers.items.length;
        minSubscribersPublicIndex = i;
      }
    }
    outArray = self.publicsForSearch[minSubscribersPublicIndex].subscribers.items.slice();
    for(var i = 0; i < self.publicsForSearch.length; i++){
      if(i == minSubscribersPublicIndex) continue;
      outArray = getCommonElements(outArray, self.publicsForSearch[i].subscribers.items);
    }
    
    return outArray;
  };

  function getCommonElements(arr1, arr2){
    var outArray = new Array();
    var ai1 = 0, ai2 = 0;
    while(ai1 < arr1.length && ai2 < arr2.length){
      if(arr1[ai1].id < arr2[ai2].id){
        ai1++;
      }else if(arr1[ai1].id > arr2[ai2].id){
        ai2++;
      }else{
        outArray.push(arr1[ai1]);
        ai1++;
        ai2++;
      }
    }
    return outArray;
  }
}]);

app.filter('locationFilter', function(){ //location and gender
  return function(users, countryId, cityId, sex){
    var outArray = new Array();
    for(var i = 0; i < users.length; i++){
      if(users[i].country && users[i].city && (users[i].country.id == countryId || countryId == 0) && (users[i].city.id == cityId || cityId == 0) && (users[i].sex == sex || sex == 0 || sex === undefined)){
        outArray.push(users[i]);
      }
    }
    return outArray;
  };
});

app.filter('undefinedPlaceFilter', function(){
  return function(users, sex){
    var outArray = new Array();
    for(var i = 0; i < users.length; i++){
      if((users[i].country === undefined || users[i].city === undefined) && (users[i].sex == sex || sex == 0 || sex === undefined)){
        outArray.push(users[i]);
      }
    }
    return outArray;
  };
});