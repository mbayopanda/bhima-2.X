angular.module('bhima.controllers')
  .controller('SearchLotsModalController', SearchLotsModalController);

// dependencies injections
SearchLotsModalController.$inject = [
  'data', 'util', 'Store', '$uibModalInstance', 'PeriodService', 'StockService',
  'SearchModalUtilService',
];

function SearchLotsModalController(data, util, Store, Instance, Periods, Stock, SearchModal) {
  const vm = this;
  const changes = new Store({ identifier : 'key' });

  vm.filters = data;
  vm.searchQueries = {};
  vm.defaultQueries = {};

  const searchQueryOptions = [
    'depot_uuid', 'inventory_uuid', 'group_uuid', 'label', 'entry_date_from',
    'entry_date_to', 'expiration_date_from', 'expiration_date_to',
    'is_expired', 'is_expiry_risk',
  ];

  // displayValues will be an id:displayValue pair
  const displayValues = {};
  const lastDisplayValues = Stock.filter.lot.getDisplayValueMap();

  // assign already defined custom filters to searchQueries object
  vm.searchQueries = util.maskObjectFromKeys(data, searchQueryOptions);

  // default filter period - directly write to changes list
  vm.onSelectPeriod = function onSelectPeriod(period) {
    const periodFilters = Periods.processFilterChanges(period);

    periodFilters.forEach(filterChange => {
      changes.post(filterChange);
    });
  };

  vm.onSelectTags = tags => {
    vm.searchQueries.tags = tags;
    displayValues.tags = tags.map(t => t.name).join(',');
  };

  // custom filter depot_uuid - assign the value to the params object
  vm.onSelectDepot = function onSelectDepot(depot) {
    vm.searchQueries.depot_uuid = depot.uuid;
    displayValues.depot_uuid = depot.text;
  };

  // custom filter inventory_uuid - assign the value to the params object
  vm.onSelectInventory = function onSelectInventory(inventory) {
    vm.searchQueries.inventory_uuid = inventory.uuid;
    displayValues.inventory_uuid = inventory.label;
  };

  // include/exclude empty lots
  vm.setIncludeEmptyLot = (value) => {
    vm.defaultQueries.includeEmptyLot = value;
    if (angular.isDefined(value)) {
      changes.post({ key : 'includeEmptyLot', value });
    }
  };

  // toggle expired stock
  vm.onToggleExpired = function onToggleExpired(bool) {
    vm.searchQueries.is_expired = bool;
  };

  // toggle expiry risks
  vm.onToggleExpiryRisk = function onToggleExpiryRisk(bool) {
    vm.searchQueries.is_expiry_risk = bool;
  };

  // default filter limit - directly write to changes list
  vm.onSelectLimit = function onSelectLimit(value) {
    // input is type value, this will only be defined for a valid number
    if (angular.isDefined(value)) {
      changes.post({ key : 'limit', value });
    }
  };

  // custom filter group_uuid - assign the value to the params object
  vm.onSelectGroup = (group) => {
    vm.searchQueries.group_uuid = group.uuid;
    displayValues.group_uuid = group.name;
  };

  // deletes a filter from the custom filter object,
  // this key will no longer be written to changes on exit
  vm.clear = function clear(key) {
    delete vm.searchQueries[key];
  };

  if (data.includeEmptyLot) {
    vm.defaultQueries.includeEmptyLot = data.includeEmptyLot;
  } else {
    vm.defaultQueries.includeEmptyLot = 0;
  }

  if (data.limit) {
    vm.defaultQueries.limit = data.limit;
  }

  vm.cancel = () => Instance.dismiss();

  vm.submit = () => {
    const loggedChanges = SearchModal.getChanges(vm.searchQueries, changes, displayValues, lastDisplayValues);
    return Instance.close(loggedChanges);
  };
}
