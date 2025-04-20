// assertion results types
type AssertionPassResultType = {
	lhsExpr: string;
	rhsExpr: string;
	rhsOperand: string;
	operator: string;
	status: string;
}

type AssertionFailResultType = {
	lhsExpr: string;
	rhsExpr: string;
	rhsOperand: string;
	operator: string;
	status: string;
	error: string;
}

type AssertionResultType = AssertionPassResultType | AssertionFailResultType;

// test results types
type TestPassResultType = {
	status: string;
	description: string;
	uid?: string;
};

type TestFailResultType = {
	status: string;
	description: string;
	error: string;
	uid?: string;
};

type TestResultType = TestPassResultType | TestFailResultType;

type EmptyRequestType = {
	method?: null | undefined;
	url?: null | undefined;
	headers?: null | undefined;
	data?: null | undefined;
	isHtml?: boolean | undefined;
}

// request types
type RequestType = {
	method: string;
	url: string;
	headers: Record<string, string | number | undefined>;
	data: string | object | null | boolean | number;
	isHtml?: boolean;
};

type EmptyResponseType = {
	status?: null | undefined;
	statusText?: null | undefined;
	headers?: null | undefined;
	data?: null | undefined;
	responseTime?: number | undefined;
	isHtml?: boolean | undefined;
}

type SkippedResponseType = {
	status?: string | null | undefined;
	statusText?: string | null | undefined;
	headers?: null | undefined;
	data?: null | undefined;
	responseTime?: number | undefined;
	isHtml?: boolean | undefined;
}

// response types
type ResponseType = {
	status: number | string;
	statusText: string;
	headers: Record<string, string | number | undefined>;
	data: string | object | null | boolean | number;
	isHtml?: boolean;
};

// result type
export type IterationDataType = {
	iterationIndex: number;
	test: {
		filename: string;
	};
	request: EmptyRequestType | RequestType;
	response: EmptyResponseType | ResponseType | SkippedResponseType;
	status: null | undefined | string;
	error: null | undefined | string;
	assertionResults?: AssertionResultType[];
	testResults?: TestResultType[];
	runtime: number;
	suitename: string;
}

// run summary type
export type RunSummaryType = {
	totalRequests: number;
	passedRequests: number;
	failedRequests: number;
	errorRequests: number;
	skippedRequests: number;
	totalAssertions: number;
	passedAssertions: number;
	failedAssertions: number;
	totalTests: number;
	passedTests: number;
	failedTests: number;
}

export type IterationsDataType = {
	iterationIndex: number,
	results: IterationDataType[]
}
