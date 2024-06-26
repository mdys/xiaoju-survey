import { createRouter, createWebHistory, type RouteLocationNormalized, type NavigationGuardNext } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useStore, type Store } from 'vuex'
import { SurveyPermissions } from '@/management/utils/types/workSpace'
import { ElMessage } from 'element-plus'
import 'element-plus/theme-chalk/src/message.scss'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/survey'
  },
  {
    path: '/survey',
    name: 'survey',
    component: () => import('../pages/list/index.vue'),
    meta: {
      needLogin: true,
      title: '问卷列表'
    }
  },
  {
    path: '/survey/:id/edit',
    meta: {
      needLogin: true,
      permissions: [SurveyPermissions.SurveyManage]
    },
    name: 'QuestionEdit',
    component: () => import('../pages/edit/index.vue'),
    children: [
      {
        path: '',
        meta: {
          needLogin: true
        },
        name: 'QuestionEditPage',
        component: () => import('../pages/edit/pages/edit/index.vue'),
        children: [
          {
            path: '',
            name: 'QuestionEditIndex',
            meta: {
              needLogin: true
            },
            component: () => import('../pages/edit/pages/edit/QuestionEditPage.vue')
          },
          {
            path: 'logic',
            name: 'LogicIndex',
            meta: {
              needLogin: true
            },
            component: () => import('../pages/edit/pages/edit/LogicEditPage.vue')
          }
        ]
      },
      {
        path: 'setting',
        name: 'QuestionEditSetting',
        meta: {
          needLogin: true
        },
        component: () => import('../pages/edit/pages/setting/index.vue')
      },
      {
        path: 'skin',
        meta: {
          needLogin: true
        },
        component: () => import('../pages/edit/pages/skin/index.vue'),
        children: [
          {
            path: '',
            name: 'QuestionSkinSetting',
            meta: {
              needLogin: true
            },
            component: () => import('../pages/edit/pages/skin/ContentPage.vue')
          },
          {
            path: 'result',
            name: 'QuestionEditResultConfig',
            meta: {
              needLogin: true
            },
            component: () => import('../pages/edit/pages/skin/ResultPage.vue')
          }
        ]
      }
    ]
  },
  {
    path: '/survey/:id/analysis',
    name: 'analysisPage',
    meta: {
      needLogin: true,
      permissions: [SurveyPermissions.DataManage]
    },
    component: () => import('../pages/analysis/AnalysisPage.vue')
  },
  {
    path: '/survey/:id/publish',
    name: 'publish',
    meta: {
      needLogin: true,
      permissions: [SurveyPermissions.SurveyManage]
    },
    component: () => import('../pages/publish/PublishPage.vue')
  },
  {
    path: '/create',
    name: 'create',
    meta: {
      needLogin: true,
      title: '创建问卷'
    },
    component: () => import('../pages/create/CreatePage.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/login/LoginPage.vue'),
    meta: {
      title: '登录'
    }
  }
]

const router = createRouter({
  history: createWebHistory('/management'),
  routes
})

router.beforeEach(async (to, from, next) => {
  const store = useStore();
  // 初始化用户信息
  if (!store.state.user?.initialized) {
    await store.dispatch('user/init');
  }
  // 更新页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }

  if (to.meta.needLogin) {
    await handleLoginGuard(to, from, next, store);
  } else {
    next();
  }
});

async function handleLoginGuard(to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext, store: Store<any>) {
  if (store.state.user?.hasLogined) {
    await handlePermissionsGuard(to, from, next, store);
  } else {
    next({
      name: 'login',
      query: { redirect: encodeURIComponent(to.path) },
    });
  }
}

async function handlePermissionsGuard(to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext, store: Store<any>) {
  const currSurveyId = to?.params?.id || ''
  const prevSurveyId = from?.params?.id || ''
  // 如果跳转页面不存在surveyId 或者不需要页面权限，则直接跳转
  if (!to.meta.permissions || !currSurveyId) {
    next()
  } else {
    // 如果跳转编辑页面，且跳转页面和上一页的surveyId不同，判断是否有对应页面权限
    if (currSurveyId !== prevSurveyId) {
      await store.dispatch('fetchCooperPermissions', currSurveyId)
      if (hasRequiredPermissions(to.meta.permissions as string[], store.state.cooperPermissions)) {
        next();
      } else {
        ElMessage.warning('您没有该问卷的相关协作权限');
        next({ name: 'survey' });
      }
    } else {
      next();
    }
  }
}

function hasRequiredPermissions(requiredPermissions: string[], userPermissions: string[]) {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}



export default router
