# 进入项目根目录
cd C:\ResearchProjectSystem\frontend\research-project-frontend

# 创建目录结构
mkdir -p src/views/{applicant,reviewer,assistant,admin}

# 创建临时页面文件（先用简单版本）
echo '<template>
  <div>
    <h2>项目申报页面（申请人）</h2>
    <p>这里将展示项目申报表单</p>
    <el-button @click="$router.back()">返回</el-button>
  </div>
</template>' > src/views/applicant/CreateProject.vue

echo '<template>
  <div>
    <h2>我的项目（申请人）</h2>
    <p>这里将展示申请人管理的项目列表</p>
    <el-button @click="$router.back()">返回</el-button>
  </div>
</template>' > src/views/applicant/MyProjects.vue

echo '<template>
  <div>
    <h2>评审任务（评审专家）</h2>
    <p>这里将展示待评审的项目列表</p>
    <el-button @click="$router.back()">返回</el-button>
  </div>
</template>' > src/views/reviewer/ReviewTasks.vue

echo '<template>
  <div>
    <h2>审核任务（科研秘书）</h2>
    <p>这里将展示待审核的项目列表</p>
    <el-button @click="$router.back()">返回</el-button>
  </div>
</template>' > src/views/assistant/AuditTasks.vue

echo '<template>
  <div>
    <h2>用户管理（管理员）</h2>
    <p>这里将展示用户管理功能</p>
    <el-button @click="$router.back()">返回</el-button>
  </div>
</template>' > src/views/admin/UserManagement.vue

echo '<template>
  <div class="not-found">
    <h1>404</h1>
    <p>页面未找到</p>
    <el-button type="primary" @click="$router.push('/dashboard')">
      返回首页
    </el-button>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 100px;
}

.not-found h1 {
  font-size: 72px;
  color: #f56c6c;
  margin-bottom: 20px;
}

.not-found p {
  font-size: 18px;
  color: #606266;
  margin-bottom: 30px;
}
</style>' > src/views/NotFound.vue