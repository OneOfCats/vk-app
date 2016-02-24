app.directive('customSelect', function($timeout){
  return {
    restrict: 'E',
    scope: {
      from: '=',
      to: '='
    },
    templateUrl: './client/components/customSelect/customSelect.html',
    link: function(scope, element, attrs){
      scope.active = false;
      scope.changeCountry = function changeCountry(index){
        scope.to = scope.from[index];
      }
      document.addEventListener('click', function(event){
        var target = event.target;
        while(target != document){
          if(target == element.children()[0]) return;
          target = target.parentNode;
        }
        scope.$apply(function(){
          scope.active = false;
        });
      });
    }
  };
});