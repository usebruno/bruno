[English](../../contributing.md)

## 함께 Bruno를 더 좋게 만들어요!!

우리는 여러분이 Bruno를 발전시키기 위해 노력해주셔서 기쁩니다. 다음은 여러분의 컴퓨터에서 Bruno를 실행하기 위한 가이드라인입니다.

### 기술 스택

Bruno는 React를 사용하여 개발되었으며, 로컬 컬렉션을 지원하는 데스크톱 버전을 제공하기 위해 Electron을 사용합니다.

사용 라이브러리

- CSS - Tailwind
- 코드 편집기 - Codemirror
- 상태 관리 - Redux
- 아이콘 - Tabler 아이콘
- 폼 - formik
- 스키마 검증 - Yup
- 요청 클라이언트 - axios
- 파일 시스템 감시자 - chokidar
- i18n - i18next

> [!중요]
> [Node v22.x 또는 최신 LTS 버전](https://nodejs.org/en/)이 필요합니다. 이 프로젝트에서는 npm 작업 공간을 사용합니다.

## 개발

Bruno는 데스크톱 앱입니다. 프런트엔드와 Electron 앱을 별도로 실행하여 앱을 로드해야 합니다.

> 참고: 프런트엔드에는 React를, 빌드 및 개발 서버에는 rsbuild를 사용합니다.

## 종속성 설치

```bash
# nodejs 22 버전 사용
nvm 사용

# deps 설치
npm i --legacy-peer-deps
```

### 로컬 개발(옵션 1)

```bash
# 패키지 빌드
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# js 샌드박스 라이브러리 번들링
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# react 앱 실행(터미널 1)
npm run dev:web

# electro 앱 실행(터미널 2)
npm run dev:electron
```

### 로컬 개발(옵션 2)

```bash
# 종속성 설치 및 설정
npm run 설정

# Electron과 React 앱을 동시에 실행
npm run dev
```

### 문제 해결

`npm install`을 실행할 때 `지원되지 않는 플랫폼` 오류가 발생할 수 있습니다. 이 문제를 해결하려면 `node_modules`와 `package-lock.json`을 삭제하고 `npm install`을 실행해야 합니다. 이렇게 하면 앱 실행에 필요한 모든 패키지가 설치됩니다.

```shell
# 하위 디렉터리의 node_modules 삭제
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# 하위 디렉터리의 package-lock 삭제
find . -type f -name "package-lock.json" -delete
```

### 테스트

```bash
# bruno-schema 테스트 실행
npm test --workspace=packages/bruno-schema

# 모든 작업 공간에 대한 테스트 실행
npm test --workspaces --if-present
```

### 풀 리퀘스트 생성

- PR은 간결하고 한 가지에 집중해 주세요.
- 브랜치 생성 형식을 준수해 주세요.
- feature/[기능 이름]: 이 브랜치에는 특정 기능에 대한 변경 사항이 포함되어야 합니다.
- 예: feature/dark-mode
- bugfix/[버그 이름]: 이 브랜치에는 특정 버그에 대한 버그 수정만 포함되어야 합니다.
- 예: bugfix/bug-1