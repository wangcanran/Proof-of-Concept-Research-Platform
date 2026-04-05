<template>
  <div class="help-center">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1>帮助中心</h1>
        <p class="header-subtitle">科研项目管理系统的使用指南与支持</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="contactSupport" icon="Phone"> 联系支持 </el-button>
        <el-button @click="downloadManual" icon="Download"> 下载手册 </el-button>
      </div>
    </div>

    <!-- 快速导航 -->
    <div class="quick-navigation">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="nav-card" shadow="hover" @click="scrollToSection('quick-start')">
            <div class="nav-card-content">
              <div class="nav-icon" style="background: #409eff">
                <el-icon><Promotion /></el-icon>
              </div>
              <h3>快速开始</h3>
              <p>系统使用入门指南</p>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 第二行：2个模块 -->
      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :span="12">
          <el-card class="nav-card" shadow="hover" @click="scrollToSection('contact')">
            <div class="nav-card-content">
              <div class="nav-icon" style="background: #c038e6">
                <el-icon><Message /></el-icon>
              </div>
              <h3>联系我们</h3>
              <p>获取技术支持</p>
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="nav-card" shadow="hover" @click="scrollToSection('announcement')">
            <div class="nav-card-content">
              <div class="nav-icon" style="background: #f56c6c">
                <el-icon><Bell /></el-icon>
              </div>
              <h3>系统公告</h3>
              <p>最新通知和更新</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索区域 - 添加搜索结果展示 -->
    <div class="search-section">
      <el-card shadow="never">
        <div class="search-container">
          <div class="search-title">
            <h2>需要帮助吗？</h2>
            <p>输入关键词搜索帮助内容</p>
          </div>
          <div class="search-input">
            <el-input
              v-model="searchKeyword"
              placeholder="请输入关键词搜索帮助内容..."
              size="large"
              @keyup.enter="handleSearch"
              clearable
              @clear="clearSearchResults"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
              <template #append>
                <el-button type="primary" @click="handleSearch"> 搜索 </el-button>
              </template>
            </el-input>
          </div>
          <div class="search-tags">
            <el-tag
              v-for="tag in hotTags"
              :key="tag"
              class="hot-tag"
              type="info"
              size="large"
              @click="searchByTag(tag)"
            >
              {{ tag }}
            </el-tag>
          </div>

          <!-- 搜索结果展示 -->
          <div v-if="showSearchResults" class="search-results">
            <div class="results-header">
              <h3>搜索结果 ({{ searchResults.length }})</h3>
              <el-button type="text" @click="clearSearchResults">清除结果</el-button>
            </div>

            <div v-if="searchResults.length > 0" class="results-list">
              <div
                v-for="result in searchResults"
                :key="result.id"
                class="result-item"
                @click="goToSearchResult(result)"
              >
                <div class="result-content">
                  <div class="result-title">
                    <el-icon><Document /></el-icon>
                    <span>{{ result.title }}</span>
                  </div>
                  <div class="result-preview">
                    {{ result.preview }}
                  </div>
                  <div class="result-meta">
                    <span class="result-type">{{ result.type }}</span>
                    <span class="result-section">{{ result.section }}</span>
                  </div>
                </div>
                <el-icon class="result-arrow"><ArrowRight /></el-icon>
              </div>
            </div>

            <div v-else class="no-results">
              <el-empty description="未找到相关帮助内容" />
              <p class="suggestions">建议：</p>
              <ul>
                <li>尝试不同的关键词</li>
                <li>查看下方分类内容</li>
                <li>联系技术支持获取帮助</li>
              </ul>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 主要内容 - 添加搜索高亮功能 -->
    <div class="main-content">
      <!-- 快速开始 -->
      <div
        class="content-section"
        id="quick-start"
        :class="{ highlighted: highlightedSection === 'quick-start' }"
      >
        <el-card shadow="never">
          <template #header>
            <div class="section-header">
              <h2>快速开始</h2>
              <span class="section-subtitle">系统使用入门指南</span>
            </div>
          </template>

          <div class="quick-start-steps">
            <el-steps :active="activeStep" finish-status="success" align-center>
              <el-step title="注册登录" description="创建账号并登录系统" />
              <el-step title="创建项目" description="开始您的第一个科研项目" />
              <el-step title="管理成果" description="记录和管理研究成果" />
              <el-step title="查看报表" description="查看项目统计和分析" />
            </el-steps>

            <div class="step-content">
              <div v-if="activeStep === 0" class="step-panel">
                <h3>第一步：注册登录</h3>
                <p>1. 点击右上角"注册"按钮创建新账户</p>
                <p>2. 填写个人信息和院系信息</p>
                <p>3. 使用邮箱和密码登录系统</p>
                <p>4. 首次登录建议完善个人资料</p>
                <el-button type="primary" @click="nextStep">我已了解，下一步</el-button>
              </div>

              <div v-else-if="activeStep === 1" class="step-panel">
                <h3>第二步：创建项目</h3>
                <p>1. 在左侧菜单点击"项目管理"</p>
                <p>2. 点击"新增项目"按钮</p>
                <p>3. 填写项目基本信息</p>
                <p>4. 上传项目相关文件（可选）</p>
                <p>5. 提交项目审核</p>
                <div class="step-actions">
                  <el-button @click="prevStep">上一步</el-button>
                  <el-button type="primary" @click="nextStep">下一步</el-button>
                </div>
              </div>

              <div v-else-if="activeStep === 2" class="step-panel">
                <h3>第三步：管理成果</h3>
                <p>1. 项目通过审核后，可以添加成果</p>
                <p>2. 在"成果管理"页面点击"新增成果"</p>
                <p>3. 选择成果类型（论文、专利等）</p>
                <p>4. 填写成果信息并上传证明文件</p>
                <p>5. 提交成果审核</p>
                <div class="step-actions">
                  <el-button @click="prevStep">上一步</el-button>
                  <el-button type="primary" @click="nextStep">下一步</el-button>
                </div>
              </div>

              <div v-else-if="activeStep === 3" class="step-panel">
                <h3>第四步：查看报表</h3>
                <p>1. 在"报表统计"页面查看总体数据</p>
                <p>2. 可以按时间、类型、状态筛选数据</p>
                <p>3. 导出报表进行离线分析</p>
                <p>4. 查看项目进展和成果统计</p>
                <div class="step-actions">
                  <el-button @click="prevStep">上一步</el-button>
                  <el-button type="primary" @click="restartSteps">重新开始</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 常见问题 -->
      <div class="content-section" id="faq" :class="{ highlighted: highlightedSection === 'faq' }">
        <el-card shadow="never">
          <template #header>
            <div class="section-header">
              <h2>常见问题 (FAQ)</h2>
              set
              <span class="section-subtitle">常见问题解答</span>
            </div>
          </template>

          <div class="faq-list">
            <el-collapse v-model="activeFaqs">
              <el-collapse-item
                v-for="(faq, index) in faqList"
                :key="faq.id"
                :name="faq.id"
                :title="faq.question"
              >
                <div class="faq-content">
                  <p>{{ faq.answer }}</p>
                  <div v-if="faq.related" class="related-links">
                    <span>相关链接：</span>
                    <el-link
                      v-for="link in faq.related"
                      :key="link.text"
                      :href="link.url"
                      type="primary"
                      :icon="link.icon"
                      style="margin-right: 15px"
                    >
                      {{ link.text }}
                    </el-link>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-card>
      </div>

      <!-- 用户指南 -->
      <div
        class="content-section"
        id="user-guide"
        :class="{ highlighted: highlightedSection === 'user-guide' }"
      >
        <el-card shadow="never">
          <template #header>
            <div class="section-header">
              <h2>用户指南</h2>
              <span class="section-subtitle">详细功能使用说明</span>
            </div>
          </template>

          <div class="user-guide-content">
            <el-tabs v-model="activeGuideTab" class="guide-tabs">
              <el-tab-pane label="项目管理" name="project">
                <div class="guide-content">
                  <h3>项目管理指南</h3>
                  <div class="guide-item">
                    <h4>1. 创建新项目</h4>
                    <p>进入"项目管理"页面，点击"新增项目"按钮，填写项目基本信息：</p>
                    <ul>
                      <li>项目名称：简明扼要的项目标题</li>
                      <li>项目类型：基础研究、应用研究等</li>
                      <li>项目周期：开始和结束日期</li>
                      <li>经费预算：项目总预算金额</li>
                      <li>项目成员：添加项目参与人员</li>
                    </ul>
                  </div>

                  <div class="guide-item">
                    <h4>2. 项目审核流程</h4>
                    <p>项目提交后进入审核流程：</p>
                    <el-timeline>
                      <el-timeline-item timestamp="1-2个工作日" placement="top">
                        <el-card>
                          <h4>科研秘书初审</h4>
                          <p>检查项目材料的完整性和合规性</p>
                        </el-card>
                      </el-timeline-item>
                      <el-timeline-item timestamp="3-5个工作日" placement="top">
                        <el-card>
                          <h4>专家评审</h4>
                          <p>相关领域专家对项目进行技术评审</p>
                        </el-card>
                      </el-timeline-item>
                      <el-timeline-item timestamp="1-2个工作日" placement="top">
                        <el-card>
                          <h4>最终审核</h4>
                          <p>科研管理部门进行最终审核</p>
                        </el-card>
                      </el-timeline-item>
                    </el-timeline>
                  </div>

                  <div class="guide-item">
                    <h4>3. 项目进度管理</h4>
                    <p>项目通过审核后，可以：</p>
                    <ul>
                      <li>定期提交项目进展报告</li>
                      <li>更新项目信息和预算</li>
                      <li>添加项目相关成果</li>
                      <li>申请经费使用</li>
                    </ul>
                  </div>
                </div>
              </el-tab-pane>

              <el-tab-pane label="成果管理" name="achievement">
                <div class="guide-content">
                  <h3>成果管理指南</h3>
                  <div class="guide-item">
                    <h4>1. 成果类型说明</h4>
                    <el-table :data="achievementTypes" style="width: 100%">
                      <el-table-column prop="type" label="成果类型" width="120" />
                      <el-table-column prop="description" label="描述" />
                      <el-table-column prop="required" label="必需材料" />
                    </el-table>
                  </div>

                  <div class="guide-item">
                    <h4>2. 成果上传要求</h4>
                    <ul>
                      <li>文件格式：PDF、DOC、DOCX、JPG、PNG</li>
                      <li>文件大小：单个文件不超过10MB</li>
                      <li>命名规范：文件名称应反映内容</li>
                      <li>证明材料：需提供相关证明文件</li>
                    </ul>
                  </div>

                  <div class="guide-item">
                    <h4>3. 成果审核标准</h4>
                    <p>成果审核主要考虑以下方面：</p>
                    <ol>
                      <li>成果的完整性和真实性</li>
                      <li>成果与项目的相关性</li>
                      <li>成果的创新性和价值</li>
                      <li>证明材料的充分性</li>
                    </ol>
                  </div>
                </div>
              </el-tab-pane>

              <el-tab-pane label="经费管理" name="fund">
                <div class="guide-content">
                  <h3>经费管理指南</h3>
                  <div class="guide-item">
                    <h4>1. 经费使用流程</h4>
                    <el-steps direction="vertical" :active="4">
                      <el-step title="预算编制" description="项目申报时编制详细预算" />
                      <el-step title="预算审核" description="科研管理部门审核预算" />
                      <el-step title="经费使用" description="按预算计划使用经费" />
                      <el-step title="报销申请" description="提交费用报销申请" />
                      <el-step title="审核支付" description="财务部门审核并支付" />
                    </el-steps>
                  </div>

                  <div class="guide-item">
                    <h4>2. 报销注意事项</h4>
                    <el-alert
                      title="重要提示"
                      type="warning"
                      description="请确保所有报销凭证真实有效，符合财务规定"
                      show-icon
                      :closable="false"
                      style="margin-bottom: 15px"
                    />
                    <ul>
                      <li>报销申请需在费用发生后30天内提交</li>
                      <li>所有票据必须合法合规</li>
                      <li>超过5000元的费用需提前申请</li>
                      <li>特殊情况需附情况说明</li>
                    </ul>
                  </div>
                </div>
              </el-tab-pane>

              <el-tab-pane label="报表统计" name="report">
                <div class="guide-content">
                  <h3>报表统计指南</h3>
                  <div class="guide-item">
                    <h4>1. 统计功能说明</h4>
                    <el-row :gutter="20">
                      <el-col :span="12">
                        <div class="feature-card">
                          <h4>📊 数据可视化</h4>
                          <p>通过图表直观展示统计数据</p>
                        </div>
                      </el-col>
                      <el-col :span="12">
                        <div class="feature-card">
                          <h4>🔍 多维筛选</h4>
                          <p>支持时间、类型、状态等多维度筛选</p>
                        </div>
                      </el-col>
                      <el-col :span="12">
                        <div class="feature-card">
                          <h4>📥 数据导出</h4>
                          <p>支持导出Excel、PDF等格式</p>
                        </div>
                      </el-col>
                      <el-col :span="12">
                        <div class="feature-card">
                          <h4>📈 趋势分析</h4>
                          <p>分析数据变化趋势</p>
                        </div>
                      </el-col>
                    </el-row>
                  </div>

                  <div class="guide-item">
                    <h4>2. 使用技巧</h4>
                    <ul>
                      <li>使用筛选功能快速定位数据</li>
                      <li>定期导出报表进行备份</li>
                      <li>关注关键指标变化趋势</li>
                      <li>利用对比功能分析差异</li>
                    </ul>
                  </div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-card>
      </div>

      <!-- 联系我们 -->
      <div
        class="content-section"
        id="contact"
        :class="{ highlighted: highlightedSection === 'contact' }"
      >
        <el-card shadow="never">
          <template #header>
            <div class="section-header">
              <h2>联系我们</h2>
              <span class="section-subtitle">获取技术支持与帮助</span>
            </div>
          </template>

          <div class="contact-content">
            <el-row :gutter="30">
              <el-col :span="12">
                <div class="contact-info">
                  <h3>技术支持</h3>
                  <div class="contact-item">
                    <el-icon><Phone /></el-icon>
                    <div class="contact-detail">
                      <div class="contact-label">技术支持热线</div>
                      <div class="contact-value">158-8772-0055</div>
                      <div class="contact-time">工作时间：工作日 9:00-18:00</div>
                    </div>
                  </div>

                  <div class="contact-item">
                    <el-icon><Message /></el-icon>
                    <div class="contact-detail">
                      <div class="contact-label">技术支持邮箱</div>
                      <div class="contact-value">2022200221@ruc.edu.cn</div>
                      <div class="contact-time">24小时内回复</div>
                    </div>
                  </div>

                  <div class="contact-item">
                    <el-icon><Location /></el-icon>
                    <div class="contact-detail">
                      <div class="contact-label">办公地址</div>
                      <div class="contact-value">北京市海淀区中关村大街59号</div>
                      <div class="contact-time">中国人民大学立德楼</div>
                    </div>
                  </div>

                  <h3 style="margin-top: 30px">服务时间</h3>
                  <div class="service-time">
                    <el-descriptions :column="1" border>
                      <el-descriptions-item label="工作日">
                        9:00 - 18:00（提供电话和现场支持）
                      </el-descriptions-item>
                      <el-descriptions-item label="周末">
                        9:00 - 17:00（仅提供紧急电话支持）
                      </el-descriptions-item>
                      <el-descriptions-item label="节假日">
                        根据国家法定节假日安排
                      </el-descriptions-item>
                    </el-descriptions>
                  </div>
                </div>
              </el-col>

              <el-col :span="12">
                <div class="contact-form">
                  <h3>在线留言</h3>
                  <p class="form-description">请填写以下表单，我们将尽快回复您</p>

                  <el-form
                    ref="contactFormRef"
                    :model="contactForm"
                    :rules="contactRules"
                    label-width="100px"
                  >
                    <el-form-item label="姓名" prop="name">
                      <el-input v-model="contactForm.name" placeholder="请输入您的姓名" />
                    </el-form-item>

                    <el-form-item label="邮箱" prop="email">
                      <el-input v-model="contactForm.email" placeholder="请输入您的邮箱" />
                    </el-form-item>

                    <el-form-item label="联系电话" prop="phone">
                      <el-input v-model="contactForm.phone" placeholder="请输入联系电话" />
                    </el-form-item>

                    <el-form-item label="问题类型" prop="type">
                      <el-select v-model="contactForm.type" placeholder="请选择问题类型">
                        <el-option label="系统使用问题" value="usage" />
                        <el-option label="技术故障" value="technical" />
                        <el-option label="功能建议" value="suggestion" />
                        <el-option label="其他问题" value="other" />
                      </el-select>
                    </el-form-item>

                    <el-form-item label="问题描述" prop="description">
                      <el-input
                        v-model="contactForm.description"
                        type="textarea"
                        :rows="5"
                        placeholder="请详细描述您遇到的问题或建议"
                        maxlength="500"
                        show-word-limit
                      />
                    </el-form-item>

                    <el-form-item>
                      <el-button type="primary" @click="submitContactForm" :loading="submitting">
                        提交留言
                      </el-button>
                      <el-button @click="resetContactForm"> 重置 </el-button>
                    </el-form-item>
                  </el-form>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>
      </div>

      <!-- 系统公告 -->
      <div
        class="content-section"
        id="announcement"
        :class="{ highlighted: highlightedSection === 'announcement' }"
      >
        <el-card shadow="never">
          <template #header>
            <div class="section-header">
              <h2>系统公告</h2>
              <span class="section-subtitle">最新系统通知和更新</span>
            </div>
          </template>

          <div class="announcement-list">
            <el-timeline>
              <el-timeline-item
                v-for="announcement in announcements"
                :key="announcement.id"
                :timestamp="announcement.date"
                :type="announcement.type"
                :icon="announcement.icon"
              >
                <el-card>
                  <h3>{{ announcement.title }}</h3>
                  <p>{{ announcement.content }}</p>
                  <div v-if="announcement.attachments" class="announcement-attachments">
                    <el-link
                      v-for="attachment in announcement.attachments"
                      :key="attachment.name"
                      :href="attachment.url"
                      :icon="Document"
                      type="primary"
                      style="margin-right: 10px"
                    >
                      {{ attachment.name }}
                    </el-link>
                  </div>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 侧边导航 -->
    <div class="side-navigation" v-if="!isMobile">
      <el-affix :offset="80">
        <el-card class="nav-sidebar" shadow="never">
          <div class="nav-title">导航菜单</div>
          <el-menu :default-active="activeNav" class="side-menu" @select="handleNavSelect">
            <el-menu-item index="quick-start">
              <el-icon><Promotion /></el-icon>
              <span>快速开始</span>
            </el-menu-item>
          </el-menu>

          <div class="help-tips">
            <h4>💡 使用提示</h4>
            <p>遇到问题？尝试以下方法：</p>
            <ul>
              <li>查看常见问题解答</li>
              <li>搜索关键词查找帮助</li>
              <li>联系技术支持</li>
            </ul>
          </div>
        </el-card>
      </el-affix>
    </div>

    <!-- 底部反馈 -->
    <div class="feedback-footer">
      <el-card shadow="never">
        <div class="feedback-content">
          <h3>帮助文档对您有用吗？</h3>
          <p>请告诉我们您的反馈，帮助我们改进</p>
          <div class="feedback-buttons">
            <el-button type="success" plain @click="handleFeedback('useful')" icon="Check">
              有帮助
            </el-button>
            <el-button type="info" plain @click="handleFeedback('normal')" icon="Minus">
              一般
            </el-button>
            <el-button type="warning" plain @click="handleFeedback('useless')" icon="Close">
              没帮助
            </el-button>
          </div>
          <el-link type="primary" @click="openFeedbackDialog" style="margin-top: 10px">
            提供详细反馈建议
          </el-link>
        </div>
      </el-card>
    </div>

    <!-- 反馈对话框 -->
    <el-dialog v-model="feedbackDialogVisible" title="提供反馈" width="500px">
      <el-form :model="feedbackForm" label-width="80px">
        <el-form-item label="反馈类型">
          <el-select v-model="feedbackForm.type" placeholder="请选择反馈类型">
            <el-option label="内容错误" value="error" />
            <el-option label="内容不足" value="insufficient" />
            <el-option label="内容过时" value="outdated" />
            <el-option label="其他建议" value="suggestion" />
          </el-select>
        </el-form-item>

        <el-form-item label="详细内容">
          <el-input
            v-model="feedbackForm.content"
            type="textarea"
            :rows="4"
            placeholder="请详细描述您的反馈或建议"
          />
        </el-form-item>

        <el-form-item label="联系方式" v-if="feedbackForm.needContact">
          <el-input v-model="feedbackForm.contact" placeholder="邮箱或电话（可选）" />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="feedbackForm.needContact"> 需要回复 </el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="feedbackDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitFeedback">提交反馈</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
// 导入图标
import {
  Promotion,
  Message,
  Bell,
  Search,
  Document,
  ArrowRight,
  Phone,
  Location,
  Check,
  Minus,
  Close,
  QuestionFilled,
  Download,
} from '@element-plus/icons-vue'

// 响应式数据
const searchKeyword = ref('')
const activeStep = ref(0)
const activeFaqs = ref([])
const activeGuideTab = ref('project')
const activeNav = ref('quick-start')
const highlightedSection = ref('')
const isMobile = ref(false)
const showSearchResults = ref(false)
const submitting = ref(false)
const feedbackDialogVisible = ref(false)

// 表单数据
const contactForm = reactive({
  name: '',
  email: '',
  phone: '',
  type: '',
  description: '',
})

const feedbackForm = reactive({
  type: '',
  content: '',
  needContact: false,
  contact: '',
})

// 其他数据
const hotTags = ref(['项目管理', '成果申报', '经费报销', '系统登录', '文件上传'])
const searchResults = ref([])
const faqList = ref([
  // FAQ数据 - 这里需要添加实际数据
  {
    id: 1,
    question: '如何注册账号？',
    answer: '点击右上角"注册"按钮，填写个人信息完成注册。',
  },
  {
    id: 2,
    question: '忘记密码怎么办？',
    answer: '在登录页面点击"忘记密码"，通过邮箱重置密码。',
  },
  // 添加更多FAQ...
])

// 方法定义
const handleSearch = () => {
  // 搜索逻辑
  showSearchResults.value = true
  // 模拟搜索结果
  if (searchKeyword.value.trim()) {
    searchResults.value = [
      {
        id: 1,
        title: '如何创建新项目',
        preview: '详细说明如何创建和管理科研项目...',
        type: '用户指南',
        section: '项目管理',
      },
    ]
  } else {
    searchResults.value = []
  }
}

const clearSearchResults = () => {
  searchResults.value = []
  showSearchResults.value = false
  searchKeyword.value = ''
}

const searchByTag = (tag) => {
  searchKeyword.value = tag
  handleSearch()
}

const scrollToSection = (sectionId) => {
  highlightedSection.value = sectionId
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

const nextStep = () => {
  if (activeStep.value < 3) {
    activeStep.value++
  }
}

const prevStep = () => {
  if (activeStep.value > 0) {
    activeStep.value--
  }
}

const restartSteps = () => {
  activeStep.value = 0
}

const handleNavSelect = (index) => {
  activeNav.value = index
  scrollToSection(index)
}

const contactSupport = () => {
  scrollToSection('contact')
}

const downloadManual = () => {
  // 下载手册逻辑
  window.open('/manual.pdf', '_blank')
}

const submitContactForm = () => {
  submitting.value = true
  // 模拟提交
  setTimeout(() => {
    ElMessage.success('留言提交成功！')
    submitting.value = false
    // 重置表单
    Object.keys(contactForm).forEach((key) => {
      contactForm[key] = ''
    })
  }, 1000)
}

const resetContactForm = () => {
  Object.keys(contactForm).forEach((key) => {
    contactForm[key] = ''
  })
}

const handleFeedback = (type) => {
  const messages = {
    useful: '感谢您的反馈！',
    normal: '感谢您的反馈，我们会继续改进！',
    useless: '抱歉没能帮到您，请提供更多建议。',
  }
  ElMessage.success(messages[type])
}

const openFeedbackDialog = () => {
  feedbackDialogVisible.value = true
}

const submitFeedback = () => {
  ElMessage.success('反馈提交成功！')
  feedbackDialogVisible.value = false
  Object.keys(feedbackForm).forEach((key) => {
    if (key !== 'needContact') feedbackForm[key] = ''
  })
  feedbackForm.needContact = false
}

// 表单验证规则
const contactRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  type: [{ required: true, message: '请选择问题类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
}

// 检查设备类型
const checkIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// 生命周期
onMounted(() => {
  checkIsMobile()
  window.addEventListener('resize', checkIsMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkIsMobile)
})
</script>

<style scoped>
/* 这里添加CSS样式 */
.help-center {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

/* 其他样式... */
</style>
