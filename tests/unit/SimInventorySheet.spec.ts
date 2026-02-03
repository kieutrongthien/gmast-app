import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SimInventorySheet from '@/components/SimInventorySheet.vue';

type PartialProps = Partial<InstanceType<typeof SimInventorySheet>['$props']>;

const ionConfig = {
  config: {
    compilerOptions: {
      isCustomElement: (tag: string) => tag.startsWith('ion-')
    }
  },
  stubs: {
    IonModal: {
      template: '<div class="ion-modal-stub"><slot /></div>'
    }
  }
};

const baseProps = {
  isOpen: true,
  slots: [
    {
      id: 'sim-ready',
      slotIndex: 0,
      label: 'SIM Ready',
      carrierName: 'Viettel',
      isoCountryCode: 'vn',
      mobileCountryCode: '452',
      mobileNetworkCode: '04',
      phoneNumber: '+84900000001',
      state: 'ready'
    },
    {
      id: 'sim-empty',
      slotIndex: 1,
      label: 'SIM Empty',
      carrierName: 'Mobi',
      isoCountryCode: 'vn',
      mobileCountryCode: '452',
      mobileNetworkCode: '05',
      state: 'empty'
    }
  ],
  status: 'ready',
  permission: 'granted',
  platform: 'android',
  pluginVersion: '8.0.0',
  reason: null,
  lastFetchedAt: '2026-02-03T10:00:00.000Z',
  loading: false,
  errorMessage: null
} as const;

const mountSheet = (override: PartialProps = {}) =>
  mount(SimInventorySheet, {
    props: { ...baseProps, ...override },
    global: ionConfig
  });

describe('SimInventorySheet', () => {
  it('renders slot inventory details', () => {
    const wrapper = mountSheet();
    const items = wrapper.findAll('[data-test="sim-slot"]');

    expect(items).toHaveLength(2);
    expect(items[0].text()).toContain('SIM Ready');
    expect(items[1].text()).toContain('SIM Empty');
  });

  it('marks unavailable slots as inactive', () => {
    const wrapper = mountSheet();
    const items = wrapper.findAll('[data-test="sim-slot"]');

    expect(items[1].classes()).toContain('slot-item--inactive');
    expect(items[0].classes()).not.toContain('slot-item--inactive');
  });

  it('shows loading state when reading inventory', () => {
    const wrapper = mountSheet({ loading: true, slots: [], status: 'ready' });

    expect(wrapper.text()).toContain('Đang đọc danh sách SIM');
  });

  it('emits refresh and close events from actions', async () => {
    const wrapper = mountSheet();

    await wrapper.get('[data-test="refresh-button"]').trigger('click');
    await wrapper.get('[data-test="close-button"]').trigger('click');

    expect(wrapper.emitted('refresh')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('shows permission warning when access is denied', () => {
    const wrapper = mountSheet({
      slots: [],
      status: 'permission-denied',
      permission: 'denied',
      loading: false
    });

    expect(wrapper.text()).toContain('Chưa có quyền đọc SIM');
  });
});
