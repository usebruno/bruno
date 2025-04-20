export const htmlTemplateString = (resutsJsonString: string) =>`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <!-- Would use latest version, you'd better specify a version -->
    <script src="https://unpkg.com/naive-ui"></script>

    <title>Bruno</title>
    <style>
      .error > .status {
        color: red;
      }
      .success > .status {
        color: green;
      }

      .n-collapse-item.success > .n-collapse-item__header {
        background-color: rgba(237, 247, 242, 1);
      }
      .n-collapse-item.error > .n-collapse-item__header {
        background-color: rgba(251, 238, 241, 1);
      }
      .skipped > .status {
        color: orange;
      }

      .min-width-150 {
        min-width: 150px;
      }
    </style>
  </head>
  <body>
    <div id="app">
      <n-config-provider :theme="theme">
        <n-layout embedded position="absolute" content-style="padding: 24px;">
          <n-card>
            <n-flex>
              <n-page-header title="Bruno run dashboard">
                <template #avatar>
                  <n-avatar size="large" style="background-color: transparent">
                    <svg id="emoji" width="34" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
                      <g id="color">
                        <path
                          fill="#F4AA41"
                          stroke="none"
                          d="M23.5,14.5855l-4.5,1.75l-7.25,8.5l-4.5,10.75l2,5.25c1.2554,3.7911,3.5231,7.1832,7.25,10l2.5-3.3333 c0,0,3.8218,7.7098,10.7384,8.9598c0,0,10.2616,1.936,15.5949-0.8765c3.4203-1.8037,4.4167-4.4167,4.4167-4.4167l3.4167-3.4167 l1.5833,2.3333l2.0833-0.0833l5.4167-7.25L64,37.3355l-0.1667-4.5l-2.3333-5.5l-4.8333-7.4167c0,0-2.6667-4.9167-8.1667-3.9167 c0,0-6.5-4.8333-11.8333-4.0833S32.0833,10.6688,23.5,14.5855z"
                        ></path>
                        <polygon
                          fill="#EA5A47"
                          stroke="none"
                          points="36,47.2521 32.9167,49.6688 30.4167,49.6688 30.3333,53.5021 31.0833,57.0021 32.1667,58.9188 35,60.4188 39.5833,59.8355 41.1667,58.0855 42.1667,53.8355 41.9167,49.8355 39.9167,50.0855"
                        ></polygon>
                        <polygon
                          fill="#3F3F3F"
                          stroke="none"
                          points="32.5,36.9188 30.9167,40.6688 33.0833,41.9188 34.3333,42.4188 38.6667,42.5855 41.5833,40.3355 39.8333,37.0855"
                        ></polygon>
                      </g>
                      <g id="hair"></g>
                      <g id="skin"></g>
                      <g id="skin-shadow"></g>
                      <g id="line">
                        <path
                          fill="#000000"
                          stroke="none"
                          d="M29.5059,30.1088c0,0-1.8051,1.2424-2.7484,0.6679c-0.9434-0.5745-1.2424-1.8051-0.6679-2.7484 s1.805-1.2424,2.7484-0.6679S29.5059,30.1088,29.5059,30.1088z"
                        ></path>
                        <path
                          fill="none"
                          stroke="#000000"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-miterlimit="10"
                          stroke-width="2"
                          d="M33.1089,37.006h6.1457c0.4011,0,0.7634,0.2397,0.9203,0.6089l1.1579,2.7245l-2.1792,1.1456 c-0.6156,0.3236-1.3654-0.0645-1.4567-0.754"
                        ></path>
                        <path
                          fill="none"
                          stroke="#000000"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-miterlimit="10"
                          stroke-width="2"
                          d="M34.7606,40.763c-0.1132,0.6268-0.7757,0.9895-1.3647,0.7471l-2.3132-0.952l1.0899-2.9035 c0.1465-0.3901,0.5195-0.6486,0.9362-0.6486"
                        ></path>
                        <path
                          fill="none"
                          stroke="#000000"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-miterlimit="10"
                          stroke-width="2"
                          d="M30.4364,50.0268c0,0-0.7187,8.7934,3.0072,9.9375c2.6459,0.8125,5.1497,0.5324,6.0625-0.25 c0.875-0.75,2.6323-4.4741,1.8267-9.6875"
                        ></path>
                        <path
                          fill="#000000"
                          stroke="none"
                          d="M44.2636,30.1088c0,0,1.805,1.2424,2.7484,0.6679c0.9434-0.5745,1.2424-1.8051,0.6679-2.7484 c-0.5745-0.9434-1.805-1.2424-2.7484-0.6679C43.9881,27.9349,44.2636,30.1088,44.2636,30.1088z"
                        ></path>
                        <path
                          fill="none"
                          stroke="#000000"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-miterlimit="10"
                          stroke-width="2"
                          d="M25.6245,42.8393c-0.475,3.6024,2.2343,5.7505,4.2847,6.8414c1.1968,0.6367,2.6508,0.5182,3.7176-0.3181l2.581-2.0233l2.581,2.0233 c1.0669,0.8363,2.5209,0.9548,3.7176,0.3181c2.0504-1.0909,4.7597-3.239,4.2847-6.8414"
                        ></path>
                        <path
                          fill="none"
                          stroke="#000000"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-miterlimit="10"
                          stroke-width="2"
                          d="M19.9509,28.3572c-2.3166,5.1597-0.5084,13.0249,0.119,15.3759c0.122,0.4571,0.0755,0.9355-0.1271,1.3631l-1.9874,4.1937 c-0.623,1.3146-2.3934,1.5533-3.331,0.4409c-3.1921-3.7871-8.5584-11.3899-6.5486-16.686 c7.0625-18.6104,15.8677-18.1429,15.8677-18.1429c2.8453-1.9336,13.1042-6.9375,24.8125,0.875c0,0,8.6323-1.7175,14.9375,16.9375 c1.8036,5.3362-3.4297,12.8668-6.5506,16.6442c-0.9312,1.127-2.7162,0.8939-3.3423-0.4272l-1.9741-4.1656 c-0.2026-0.4275-0.2491-0.906-0.1271-1.3631c0.6275-2.3509,2.4356-10.2161,0.119-15.3759"
                        ></path>
                        <path
                          fill="none"
                          stroke="#000000"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-miterlimit="10"
                          stroke-width="2"
                          d="M52.6309,46.4628c0,0-3.0781,6.7216-7.8049,8.2712"
                        ></path>
                        <path
                          fill="none"
                          stroke="#000000"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-miterlimit="10"
                          stroke-width="2"
                          d="M19.437,46.969c0,0,3.0781,6.0823,7.8049,7.632"
                        ></path>
                        <line
                          x1="36.2078"
                          x2="36.2078"
                          y1="47.3393"
                          y2="44.3093"
                          fill="none"
                          stroke="#000000"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-miterlimit="10"
                          stroke-width="2"
                        ></line>
                      </g>
                    </svg>
                  </n-avatar>
                </template>
                <template #extra>
                  <n-flex justify="end">
                    <n-switch v-model:value="darkMode" :rail-style="darkModeRailStyle">
                      <template #checked> Dark </template>
                      <template #unchecked> Light </template>
                    </n-switch>
                  </n-flex>
                </template>
              </n-page-header>
              <n-tabs type="segment" animated>
                <n-tab-pane name="summary" tab="Summary">
                  <n-flex justify="center" vertical>
                    <x-summary v-for="(result, index) in res" :res="result" :key="index"></x-summary>
                  </n-flex>
                </n-tab-pane>
                <n-tab-pane name="Requests" tab="Requests">
                  <n-flex justify="center" vertical>
                    <x-requests v-for="(result, index) in res" :res="result" :key="index"></x-requests>
                  </n-flex>
                </n-tab-pane>
              </n-tabs>
            </n-flex>
          </n-card>
        </n-layout>
      </n-config-provider>
    </div>
    <script type="text/x-template" id="summary-component">
      <n-flex vertical style="margin-bottom: 50px;">
        <n-card>
          <template #header>
            <span style="font-size: 24px;">{{ iterationTitle }}</span>
          </template>
          <n-flex justify="center">
            <n-flex justify="center">
              <n-alert type="success">
                <n-statistic
                  label="Total requests"
                  :value="summaryTotalRequests"
                >
                </n-statistic>
              </n-alert>
              <n-alert :type="summaryErrors ? 'error' : 'success'">
                <n-statistic label="Total errors" :value="summaryErrors">
                </n-statistic>
              </n-alert>
              <n-alert type="success">
                <n-statistic
                  label="Total Controls"
                  :value="summaryTotalControls"
                >
                </n-statistic>
              </n-alert>
              <n-alert :type="summaryFailedControls ? 'error' : 'success'">
                <n-statistic
                  label="Total Failed Controls"
                  :value="summaryFailedControls"
                >
                </n-statistic>
              </n-alert>
              <n-alert type="warning" v-if="summarySkippedRequests">
                <n-statistic label="Skipped requests" :value="summarySkippedRequests">
                </n-statistic>
              </n-alert>
              <n-statistic
              label="Total run duration"
              :value="Math.round(totalRunDuration*1000)/1000"
            >
              <template #suffix>s</template>
            </n-statistic>
            </n-flex>
          </n-flex>
        </n-card>
        <n-data-table :columns="summaryColumns" :data="summaryData" />
      </n-flex>
    </script>
    <script type="text/x-template" id="requests-component">
      <n-card>
        <template #header>
          <span style="font-size: 24px;">{{ iterationTitle }}</span>
        </template>
        <n-flex vertical style="margin-bottom: 50px">
          <n-switch
            v-model:value="onlyFailed"
            :rail-style="railStyle"
          >
            <template #checked> Only Failed </template>
            <template #unchecked> Show All </template>
          </n-switch>

          <n-collapse>
            <x-results-group v-for="(results, group) in groupedResults" :results="results" :group="group" :key="group + '-' + results.length"></x-results-group>
          </n-collapse>
        </n-flex>
      </n-card>
    </script>
    <script type="text/x-template" id="results-group-component">
      <n-collapse-item
        :name="group"
        arrow-placement="right"
      >
        <template #header>
          <n-alert
            :type="hasError || hasFailure ? 'error' : 'success'"
            :bordered="false"
          >
            <template #header>
              {{group}} - {{totalPassed}} / {{total}} Passed {{ hasError? " - Error" : "" }}
            </template>
          </n-alert>
        </template>
        <n-collapse>
          <x-result v-for="(result, index) in results" :result="result" :group="group" :key="index"></x-result>
        </n-collapse>
      </n-collapse-item>
    </script>
    <script type="text/x-template" id="result-component">
      <n-collapse-item
        :name="name"
        arrow-placement="right"
      >
        <template #header>
          <n-alert
            :type="getAlertType"
            :bordered="false"
          >
            <template #header>
              {{suitename}} - {{result.response.status === 'skipped' ? 'Skipped' : (totalPassed + '/' + total + ' Passed')}} {{hasError ? " - Error" : "" }}
            </template>
          </n-alert>
        </template>
        <n-flex vertical>
          <n-grid x-gap="12" :cols="2">
            <n-gi>
              <n-card title="REQUEST INFORMATION">
                <n-list>
                  <n-list-item>
                    <n-thing
                      title="File"
                      :description="result.test.filename"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Request Method"
                      :description="result.request.method"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Request URL"
                      :description="result.request.url"
                    />
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="RESPONSE INFORMATION">
                <n-list>
                  <n-list-item>
                    <n-thing
                      title="Response Code"
                      :description="'' + result.response.status"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Response time"
                      :description="result.response.responseTime + ' ms'"
                    />
                  </n-list-item>
                  <n-list-item>
                    <n-thing
                      title="Test duration"
                      :description="testDuration"
                    />
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>
          </n-grid>
          <n-alert v-if="hasError" title="Error" type="error">
            {{result.error}}
          </n-alert>
          <n-card title="REQUEST HEADERS">
            <n-data-table
              :columns="headerColumns"
              :data="headerDataRequest"
            />
          </n-card>
          <n-card
            v-if="result.request.data"
            title="REQUEST BODY"
          >
          <iframe
            v-if="result.request.isHtml"
            :srcdoc="result.request.data"
            style="width: 100%; height: 400px; border: none;"
          ></iframe>

          <pre v-else>{{ result.request.data }}</pre>
          </n-card>
          <n-card title="RESPONSE HEADERS">
            <n-data-table
              :columns="headerColumns"
              :data="headerDataResponse"
            />
          </n-card>
          <n-card
            v-if="result.response.data"
            title="RESPONSE BODY"
          >
          <iframe
            v-if="result.response.isHtml"
            :srcdoc="result.response.data"
            style="width: 100%; height: 400px; border: none;"
          ></iframe>

          <pre v-else>{{ result.response.data }}</pre>          </n-card>
          <n-card title="ASSERTIONS INFORMATION">
            <n-data-table
              :columns="assertionsColumns"
              :data="result.assertionResults"
              :row-class-name="assertionsRowClassName"
            />
          </n-card>
          <n-card title="TESTS INFORMATION">
            <n-data-table
              :columns="testsColumns"
              :data="result.testResults"
              :row-class-name="testsRowClassName"
            />
          </n-card>
        </n-flex>
      </n-collapse-item>
    </script>
    <script>
      const { createApp, ref, computed } = Vue;

      const App = {
        setup() {
          function decodeBase64(base64) {
            const binary = atob(base64); // Base64 → binary string
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0)); // binary → bytes
            return new TextDecoder().decode(bytes); // bytes → UTF-8 string
          }
          const res = JSON.parse(decodeBase64('${resutsJsonString}'));

          const darkMode = ref(false);
          const theme = computed(() => {
            return darkMode.value ? naive.darkTheme : null;
          });
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            darkMode.value = true;
          }
          // To watch for os theme changes
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
            darkMode.value = event.matches;
          });
          return {
            res,
            theme,
            darkMode,
            darkModeRailStyle: () => ({ background: 'var(--n-rail-color)' })
          };
        }
      };
      const app = Vue.createApp(App);

      app.component('x-summary', {
        template: '#summary-component',
        props: ['res'],
        setup(props) {
          const summaryColumns = [
            {
              title: 'SUMMARY ITEM',
              key: 'title'
            },
            {
              title: 'TOTAL',
              key: 'total'
            },
            {
              title: 'PASSED',
              key: 'passed'
            },
            {
              title: 'FAILED',
              key: 'failed'
            },
            {
              title: 'SKIPPED',
              key: 'skipped'
            },
            {
              title: 'ERROR',
              key: 'error'
            }
          ];
          const summaryData = computed(() => [
            {
              title: 'Requests',
              total: props.res.summary.totalRequests,
              passed: props.res.summary.passedRequests,
              failed: props.res.summary.failedRequests,
              skipped: props.res.summary.skippedRequests,
              error: props.res.summary.errorRequests
            },
            {
              title: 'Assertions',
              total: props.res.summary.totalAssertions,
              passed: props.res.summary.passedAssertions,
              failed: props.res.summary.failedAssertions,
              skipped: '-',
              error: '-'
            },
            {
              title: 'Tests',
              total: props.res.summary.totalTests,
              passed: props.res.summary.passedTests,
              failed: props.res.summary.failedTests,
              skipped: '-',
              error: '-'
            }
          ]);
          const summaryTotalRequests = computed(() => {
            return props.res.summary.totalRequests;
          });
          const summaryTotalControls = computed(() => {
            return props.res.summary.totalTests + props.res.summary.totalAssertions;
          });
          const summaryFailedControls = computed(
            () => props?.res?.summary?.failedTests + props?.res?.summary?.failedAssertions
          );
          const summarySkippedRequests = computed(() => props?.res?.summary?.skippedRequests || 0);
          const summaryErrors = computed(() => props?.res?.results?.filter((r) => r.error || r.status === 'error').length) || 0;
          const totalRunDuration = computed(() => props.res?.results?.reduce((total, test) => test.runtime + total, 0));
          const iterationIndex = Number(props.res.iterationIndex) + 1;
          return {
            summaryColumns,
            summaryData,
            summaryTotalControls,
            summaryTotalRequests,
            summaryFailedControls,
            summarySkippedRequests,
            summaryErrors,
            totalRunDuration,
            iterationTitle: 'Iteration ' + iterationIndex
          };
        }
      });

      app.component('x-requests', {
        template: '#requests-component',
        props: ['res'],
        setup(props) {
          const onlyFailed = ref(false);
          const filteredResults = computed(() => {
            if (onlyFailed.value) {
              return props?.res?.results?.filter(
                (r) =>
                  r.status === 'error' ||
                  !!r?.testResults?.find((t) => t.status !== 'pass') ||
                  !!r?.assertionResults?.find((t) => t.status !== 'pass')
              );
            }
            return props.res.results;
          });
          const groupedResults = computed(() => {
            return filteredResults.value.reduce((groups, curr) => {
              const path = curr?.suitename?.split('/');
              const test = path.pop();
              const name = (path.length || 0) ? path.join('/') : '(root)';
              if (!groups[name]) {
                groups[name] = [];
              }
              groups[name].push(curr);
              return groups;
            }, {});
          });
          const iterationIndex = Number(props.res.iterationIndex) + 1;
          return {
            onlyFailed,
            groupedResults,
            railStyle: ({ checked }) => {
              const style = {};
              if (checked) {
                style.background = '#d03050';
              }
              return style;
            },
            iterationTitle: 'Iteration ' + iterationIndex
          };
        }
      });

      app.component('x-results-group', {
        template: '#results-group-component',
        props: ['group', 'results'],
        setup(props) {
          const totalPassed = computed(() => {
            return props.results.reduce((total, curr) => {
              return (
                total +
                (curr?.testResults?.filter((t) => t.status === 'pass').length || 0) +
                (curr?.assertionResults?.filter((t) => t.status === 'pass').length || 0)
              );
            }, 0);
          });
          const total = computed(() => {
            return props.results.reduce((total, curr) => {
              return total + (curr?.testResults?.length || 0) + (curr?.assertionResults?.length || 0);
            }, 0);
          });
          const hasError = computed(() => props.results.some((r) => !!r.error || r?.status === 'error'));
          const hasFailure = computed(() => totalPassed.value !== total.value);
          return {
            totalPassed,
            total,
            hasFailure,
            hasError,
            group: props.group,
            results: props.results
          };
        }
      });

      app.component('x-result', {
        template: '#result-component',
        props: ['group', 'result'],
        setup(props) {
          const headerColumns = [
            {
              title: 'Header Name',
              key: 'name',
              className: 'min-width-150'
            },
            {
              title: 'Header Value',
              key: 'value'
            }
          ];
          const assertionsColumns = [
            {
              title: 'Expression',
              key: 'lhsExpr'
            },
            {
              title: 'Operator',
              key: 'operator'
            },
            {
              title: 'Operand',
              key: 'rhsOperand'
            },
            {
              title: 'Status',
              key: 'status',
              className: 'status'
            },
            {
              title: 'Error',
              key: 'error'
            }
          ];
          const assertionsRowClassName = (row) => {
            return row.status === 'fail' ? 'error' : 'success';
          };
          const testsRowClassName = (row) => {
            if (row.status === 'skipped') return 'skipped';
            return row.status === 'fail' ? 'error' : 'success';
          };
          const testsColumns = [
            {
              title: 'Description',
              key: 'description'
            },
            {
              title: 'Status',
              key: 'status',
              className: 'status'
            },
            {
              title: 'Error',
              key: 'error'
            }
          ];

          function mapHeaderToTableData(headers) {
            if (!headers) {
              return [];
            }
            return Object.keys(headers).map((name) => ({
              name,
              value: headers[name]
            }));
          }
          const headerDataRequest = computed(() => {
            return mapHeaderToTableData(props?.result?.request?.headers);
          });
          const headerDataResponse = computed(() => {
            return mapHeaderToTableData(props?.result?.response?.headers);
          });
          const totalPassed = computed(() => {
            return (
              (props?.result?.testResults?.filter((t) => t.status === 'pass').length || 0) +
              (props?.result?.assertionResults?.filter((t) => t.status === 'pass').length || 0)
            );
          });
          const total = computed(() => {
            return (props?.result?.testResults?.length || 0) + (props?.result?.assertionResults?.length || 0);
          });

          const hasError = computed(() => !!props?.result?.error || props?.result?.status === 'error');
          const hasFailure = computed(() => total.value !== totalPassed.value);
          const suitename = computed(() => props?.result?.suitename?.replace(props.group + '/', ''));
          const testDuration = computed(() => Math.round(props?.result?.runtime * 1000) + ' ms');
          const name = computed(() => props?.result?.suitename + props?.result?.runtime);
          const getAlertType = computed(() => {
            if (props.result.response.status === 'skipped') {
              return 'warning';
            }
            return hasError.value || hasFailure.value ? 'error' : 'success';
          });
          return {
            headerColumns,
            headerDataRequest,
            headerDataResponse,
            assertionsColumns,
            assertionsRowClassName,
            testsRowClassName,
            totalPassed,
            total,
            hasFailure,
            hasError,
            testsColumns,
            result: props.result,
            suitename,
            testDuration,
            name,
            getAlertType,
            iterationIndex: props?.result?.iterationIndex
          };
        }
      });

      app.use(naive);
      app.mount('#app');
    </script>
  </body>
</html>
`;

export default htmlTemplateString;
