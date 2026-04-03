import { createRouter, createWebHistory } from 'vue-router'
import IndexView from '@/views/index/index.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'index',
      component: IndexView,
    },
    {
      path: '/:path(.*)*',
      name: 'PageNotFound',
      component: () => import('@/views/404/index.vue'),
      meta: { title: '访问页面不存在页' }
    }
  ],
})
