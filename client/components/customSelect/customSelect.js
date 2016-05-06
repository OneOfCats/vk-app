app.directive('customSelect', function(){
  return {
    restrict: 'E',
    scope: {
      from: '=',
      to: '=',
      depending: '=dependsOn' //Создаст в этом изолированном scope объект, который возьмёт из атрибута depends-on (да, именно с дефизом)
    },
    templateUrl: './client/components/customSelect/customSelect.html',
    link: function(scope, element, attrs){
      scope.active = false;
      scope.changeItem = function changeCountry(index){
        scope.to = scope.from[index];
        scope.depending = scope.from[index].title;
      }
      scope.$watch('depending', function(current, old){
        scope.active = true;
      });
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