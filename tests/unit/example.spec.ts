import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import HomePage from '@/views/HomePage.vue';
import en from '@/i18n/locales/en';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en }
});

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
        },
        plugins: [i18n]
      }
    });

    expect(wrapper.find('.queue-list-stub').exists()).toBe(true);
  });
});
