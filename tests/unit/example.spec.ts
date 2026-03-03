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
  it('renders queue title and hero section', () => {
    const wrapper = mount(HomePage, {
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag: string) => tag.startsWith('ion-')
          }
        },
        plugins: [i18n]
      }
    });

    expect(wrapper.text()).toContain('Queue');
    expect(wrapper.find('.home-hero').exists()).toBe(true);
  });
});
