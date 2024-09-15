[English](../../contributing.md)

## 함께 Bruno를 더 좋게 만들어요!!

우리는 여러분이 Bruno를 발전시키기 위해 노력해주셔서 기쁩니다. 다음은 여러분의 컴퓨터에서 Bruno를 불러오는 가이드라인입니다.

### 기술 스택

Bruno는 Next.js와 React로 구축되었습니다. 또한, (로컬 컬렉션을 지원하는) 데스크톱 버전을 제공하기 위해 electron을 사용합니다.

우리가 사용하는 라이브러리

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar

### 의존성

[Node v20.x 혹은 최신 LTS version](https://nodejs.org/en/)과 npm 8.x 버전이 필요합니다. 우리는 이 프로젝트에서 npm workspaces를 사용합니다.

## 개발

Bruno는 데스크톱 앱으로 개발되고 있습니다. 한 터미널에서 Next.js를 실행하여 앱을 로드한 다음 다른 터미널에서 electron 앱을 실행해야합니다.

### 로컬 개발

```bash
# nodejs 18 버전 사용
nvm use

# 의존성 설치
npm i --legacy-peer-deps

# packages 빌드
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common

# next 앱 실행 (1번 터미널)
npm run dev:web

# electron 앱 실행 (2번 터미널)
npm run dev:electron
```

### 트러블 슈팅

`npm install`을 실행할 때, `Unsupported platform` 에러를 마주칠 수 있습니다. 이것을 고치기 위해서는 `node_modules`와 `package-lock.json`을 삭제하고 `npm install`을 실행해야 합니다.
그러면 앱을 실행하기 위해 필요한 패키지들이 모두 설치됩니다.

```shell
# 하위 디렉토리에 있는 node_modules 삭제
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# 하위 디렉토리에 있는 package-lock 삭제
find . -type f -name "package-lock.json" -delete
```

### 테스팅

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### Pull Requests 요청

- PR을 작게 유지하고 한가지에 집중해주세요.
- 브랜치를 생성하는 형식을 따라주세요.
  - feature/[feature name]: 이 브랜치는 특정 기능에 대한 변경사항이 포함되어야합니다.
    - 예시: feature/dark-mode
  - bugfix/[bug name]: 이 브랜치는 특정 버그에 대한 버그 수정만 포함되어야합니다.
    - 예시: bugfix/bug-1
