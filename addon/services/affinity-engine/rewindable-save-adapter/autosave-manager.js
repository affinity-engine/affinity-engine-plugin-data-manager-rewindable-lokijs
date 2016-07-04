import Ember from 'ember';
import { MultitonIdsMixin, configurable } from 'affinity-engine';
import { BusPublisherMixin, BusSubscriberMixin } from 'ember-message-bus';
import multiton from 'ember-multiton-service';

const {
  Service,
  computed,
  get,
  run
} = Ember;

const { inject: { service } } = Ember;

const configurationTiers = [
  'config.attrs.autosaveManager',
  'config.attrs.saveStateManager',
  'config.attrs.globals'
];

export default Service.extend(BusPublisherMixin, BusSubscriberMixin, MultitonIdsMixin, {
  store: service(),

  config: multiton('affinity-engine/config', 'engineId'),

  maxAutosaves: configurable(configurationTiers, 'maxAutosaves'),

  init(...args) {
    this._super(...args);

    const engineId = get(this, 'engineId');

    this.on(`ae:${engineId}:shouldWriteAutosave`, this, this.writeAutosave);
  },

  autosaves: computed({
    get() {
      const engineId = get(this, 'engineId');

      return get(this, 'store').query('affinity-engine/local-save', {
        engineId,
        isAutosave: true
      });
    }
  }).readOnly().volatile(),

  writeAutosave() {
    get(this, 'autosaves').then((autosaves) => {
      run(() => {
        const engineId = get(this, 'engineId');

        if (get(this, 'maxAutosaves') > get(autosaves, 'length')) {
          this.publish(`ae:${engineId}:shouldCreateSave`, '', { isAutosave: true });
        } else {
          const autosave = autosaves.sortBy('updated').get('firstObject');

          this.publish(`ae:${engineId}:shouldUpdateSave`, autosave);
        }
      });
    });
  }
});
