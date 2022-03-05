import { ref, watch, nextTick, onMounted, onBeforeUnmount, defineComponent } from 'vue';
import isFunction from 'lodash/isFunction';
import { prefix } from '../config';
import { on, off, getScrollContainer } from '../utils/dom';
import props from './props';
import { ScrollContainerElement } from '../common';
import { renderTNodeJSX } from '../utils/render-tnode';

const name = `${prefix}-affix`;

export default defineComponent({
  name: 'TAffix',
  props,
  emits: ['fixedChange'],
  setup(props, context) {
    const { emit } = context;
    const affixRef = ref(null);
    const fixedTop = ref<false | number>(false);
    const scrollContainer = ref<ScrollContainerElement>();
    const containerHeight = ref(0);
    const ticking = ref(false);

    const calcInitValue = () => {
      let _containerHeight = 0; // 获取当前可视的高度
      if (scrollContainer.value instanceof Window) {
        _containerHeight = scrollContainer.value.innerHeight;
      } else {
        _containerHeight = scrollContainer.value.clientHeight;
      }

      // 需要减掉当前节点的高度，对比的高度应该从 border-top 比对开始
      containerHeight.value = _containerHeight - (affixRef.value.clientHeight || 0);
      handleScroll();
    };

    const handleScroll = () => {
      if (!ticking.value) {
        window.requestAnimationFrame(() => {
          const { top } = affixRef.value.getBoundingClientRect(); // top = 节点到页面顶部的距离，包含 scroll 中的高度
          let containerTop = 0; // containerTop = 容器到页面顶部的距离
          if (scrollContainer.value instanceof HTMLElement) {
            containerTop = scrollContainer.value.getBoundingClientRect().top;
          }
          const calcTop = top - containerTop; // 节点顶部到 container 顶部的距离
          const calcBottom = containerTop + containerHeight.value - props.offsetBottom; // 计算 bottom 相对应的 top 值
          if (props.offsetTop !== undefined && calcTop <= props.offsetTop) {
            // top 的触发
            fixedTop.value = containerTop + props.offsetTop;
          } else if (props.offsetBottom !== undefined && top >= calcBottom) {
            // bottom 的触发
            fixedTop.value = calcBottom;
          } else {
            fixedTop.value = false;
          }
          ticking.value = false;
          emit('fixedChange', fixedTop.value !== false, { top: fixedTop.value });
          if (isFunction(props.onFixedChange)) props.onFixedChange(fixedTop.value !== false, { top: fixedTop.value });
        });
        ticking.value = true;
      }
    };

    watch(
      () => props.offsetTop,
      () => {
        calcInitValue();
      },
    );

    watch(
      () => props.offsetBottom,
      () => {
        calcInitValue();
      },
    );

    onMounted(async () => {
      await nextTick();
      scrollContainer.value = getScrollContainer(props.container);
      calcInitValue();
      on(scrollContainer.value, 'scroll', handleScroll);
      on(window, 'resize', calcInitValue);
      if (!(scrollContainer.value instanceof Window)) on(window, 'scroll', handleScroll);
    });

    onBeforeUnmount(() => {
      if (!scrollContainer.value) return;
      off(scrollContainer.value, 'scroll', handleScroll);
      off(window, 'resize', calcInitValue);
      if (!(scrollContainer.value instanceof Window)) off(window, 'scroll', handleScroll);
    });

    return {
      affixRef,
      fixedTop,
      scrollContainer,
    };
  },
  render() {
    const { fixedTop, zIndex } = this;

    const attrs = fixedTop !== false ? this.$attrs : {};
    return (
      <div {...attrs} ref="affixRef">
        {fixedTop !== false ? (
          <div class={name} style={{ zIndex, top: `${fixedTop}px` }}>
            {renderTNodeJSX(this, 'default')}
          </div>
        ) : (
          <div ref="affixRef">{renderTNodeJSX(this, 'default')}</div>
        )}
      </div>
    );
  },
});
