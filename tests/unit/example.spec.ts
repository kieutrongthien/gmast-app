import { mount } from '@vue/test-utils';
import HomePage from '@/views/HomePage.vue';

describe('HomePage.vue', () => {
  it('mounts with queue list placeholder', () => {
    const wrapper = mount(HomePage, {
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag: string) => tag.startsWith('ion-')
          }
        },
        stubs: {
          'queue-list': {
            template: '<div class="queue-list-stub">queue</div>'
          }
        }
      }
    });

    expect(wrapper.find('.queue-list-stub').exists()).toBe(true);
  });
});
