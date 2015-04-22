api.factory('Function', ["SQLClient", function (SQLClient) {
    return function (functionFromDB, manager) {
        angular.extend(this, functionFromDB);

        this.api = new SQLClient();

        this.updateDefinition = function () {
            var self = this;

            var action = function (result) {
                manager.getAll();
            };

            this.api.send(this.definition, action);
        }
    }
}]);

cdbmanager.service("functions", ["SQLClient", "Function", function (SQLClient, Function) {
    this.api = new SQLClient();

    this.current = null;

    this.getAll = function () {
        var self = this;

        var action = function () {
            for (var i = 0; i < self.api.items.length; i++) {
                self.api.items[i] = new Function(self.api.items[i], self);
            }
        };
        this.api.send("select pg_proc.oid as _oid, pg_proc.*, pg_get_functiondef(pg_proc.oid) as definition from pg_proc, pg_roles where pg_proc.proowner = pg_roles.oid and pg_roles.rolname = current_user;", action);
    };
}]);

cdbmanager.controller('functionSelectorCtrl', ["$scope", "functions", "endpoints", "nav", function ($scope, functions, endpoints, nav) {
    $scope.nav = nav;

    $scope.showFunction = function (func) {
        nav.current = "functions.function";
        functions.current = func;
    };

    $scope.refreshList = function () {
        functions.getAll();
    };

    // update function list when current endpoint changes
    $scope.$watch(function () {
        return endpoints.current;
    }, function () {
        $scope.functions = functions.getAll();
    }, true);

    $scope.$watch(function () {
        return functions.api.items;
    }, function (functionList) {
        $scope.functions = functionList;
    });

    // Watch current function
    $scope.$watch(function () {
        return functions.current;
    }, function (currentFunction) {
        $scope.currentFunction = currentFunction;
    });
}]);

cdbmanager.controller('functionsCtrl', ["$scope", "functions", "endpoints", "nav", "settings", function ($scope, functions, endpoints, nav, settings) {
    $scope.nav = nav;

    $scope.cdbrt = {
        rowsPerPage: settings.sqlConsoleRowsPerPage,
        skip: ["prosrc", "api", "definition"]
    };
    $scope.actions = [
        {
            text: "View source code",
            onClick: function (func) {
                nav.current = "functions.function";
                functions.current = func;
            }
        }
    ];

    // update function list when current endpoint changes
    $scope.$watch(function () {
        return endpoints.current;
    }, function () {
        $scope.functions = functions.getAll();
    }, true);

    $scope.$watch(function () {
        return functions.api.items;
    }, function (functionList) {
        $scope.functions = functionList;
    });
}]);

cdbmanager.controller('functionCtrl', ["$scope", "nav", "functions", function ($scope, nav, functions) {
    $scope.nav = nav;

    $scope.running = null;
    $scope.error = null;
    $scope.updated = null;

    // codemirror configuration
    var mime = 'text/x-mariadb';
    if (window.location.href.indexOf('mime=') > -1) {
        mime = window.location.href.substr(window.location.href.indexOf('mime=') + 5);
    }
    $scope.editorOptions = {
        mode: 'text/x-sql',
        indentWithTabs: false,
        smartIndent: true,
        lineNumbers: true,
        matchBrackets : true,
        autofocus: true
    };

    $scope.updateFunction = function (func) {
        func.updateDefinition();
    };

    //
    $scope.$watch(function () {
        return functions.current;
    }, function (currentFunction) {
        $scope.functionInEditor = angular.copy(currentFunction);
        functions.api.updated = false;
    });

    $scope.$watch(function () {
        return functions.api.error400;
    }, function (error) {
        $scope.error = error;
    });

    $scope.$watch(function () {
        return functions.api.updated;
    }, function (updated) {
        $scope.updated = updated;
    });

    $scope.$watch(function () {
        return functions.api.running;
    }, function (running) {
        $scope.running = running;
    });

    $scope.codemirrorLoaded = function (editor) {
        var ctrlEnter = {
            "Ctrl-Enter": function () {
                $scope.updateFunction($scope.functionInEditor);
            }
        };
        editor.addKeyMap(ctrlEnter);
    };
}]);
