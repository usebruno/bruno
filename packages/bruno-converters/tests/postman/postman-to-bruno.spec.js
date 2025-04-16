import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../src/postman/postman-to-bruno';
// import { postmanToBruno } from '../../dist/esm/index.js';

describe('postman-collection', () => {
  it('should correctly import a valid Postman collection file', async () => {
    const brunoCollection = postmanToBruno(postmanCollection);
    expect(brunoCollection).toMatchObject(expectedOutput);
  });
});

const postmanCollection = {
	"info": {
		"_postman_id": "0596d399-cfd2-4f8f-9869-65238eb40a45",
		"name": "CRUD",
		"schema": "https://schema.getpostman.com/json/collection/v2.0.0/collection.json",
		"_exporter_id": "32111649",
		"_collection_link": "https://www.postman.com/fudzi9/workspace/nodejs/collection/16541095-0596d399-cfd2-4f8f-9869-65238eb40a45?action=share&source=collection_link&creator=32111649"
	},
	"item": [
		{
			"name": "GET",
			"request": {
				"method": "GET",
				"header": [],
				"url": "https://node-task2.herokuapp.com/api/notes/"
			},
			"response": [
				{
					"name": "1.GET",
					"originalRequest": {
						"method": "GET",
						"header": [],
						"url": "https://node-task2.herokuapp.com/api/notes/"
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "json",
					"header": [
						{
							"key": "Server",
							"value": "Cowboy"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "X-Powered-By",
							"value": "Express"
						},
						{
							"key": "Content-Type",
							"value": "application/json; charset=utf-8"
						},
						{
							"key": "Content-Length",
							"value": "2"
						},
						{
							"key": "Etag",
							"value": "W/\"2-l9Fw4VUO7kr8CvBlt4zaMCqXZ0w\""
						},
						{
							"key": "Date",
							"value": "Tue, 06 Jul 2021 21:30:45 GMT"
						},
						{
							"key": "Via",
							"value": "1.1 vegur"
						}
					],
					"cookie": [],
					"body": "[]"
				},
				{
					"name": "3.GET",
					"originalRequest": {
						"method": "GET",
						"header": [],
						"url": "https://node-task2.herokuapp.com/api/notes/"
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "json",
					"header": [
						{
							"key": "Server",
							"value": "Cowboy"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "X-Powered-By",
							"value": "Express"
						},
						{
							"key": "Content-Type",
							"value": "application/json; charset=utf-8"
						},
						{
							"key": "Content-Length",
							"value": "96"
						},
						{
							"key": "Etag",
							"value": "W/\"60-ixboSJswZpL0hV7rJrY1IE5nQlM\""
						},
						{
							"key": "Date",
							"value": "Tue, 06 Jul 2021 21:58:32 GMT"
						},
						{
							"key": "Via",
							"value": "1.1 vegur"
						}
					],
					"cookie": [],
					"body": "[\n    {\n        \"id\": 1,\n        \"title\": \"first\",\n        \"content\": \"some text\",\n        \"createdAt\": \"some date\",\n        \"updatedAt\": \"some date\"\n    }\n]"
				},
				{
					"name": "5.GET",
					"originalRequest": {
						"method": "GET",
						"header": [],
						"url": "https://node-task2.herokuapp.com/api/notes/"
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "json",
					"header": [
						{
							"key": "Server",
							"value": "Cowboy"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "X-Powered-By",
							"value": "Express"
						},
						{
							"key": "Content-Type",
							"value": "application/json; charset=utf-8"
						},
						{
							"key": "Content-Length",
							"value": "192"
						},
						{
							"key": "Etag",
							"value": "W/\"c0-rg+VAYKuV+nAzdAnddMXRNSM3tg\""
						},
						{
							"key": "Date",
							"value": "Tue, 06 Jul 2021 22:01:36 GMT"
						},
						{
							"key": "Via",
							"value": "1.1 vegur"
						}
					],
					"cookie": [],
					"body": "[\n    {\n        \"id\": 1,\n        \"title\": \"first\",\n        \"content\": \"some text\",\n        \"createdAt\": \"some date\",\n        \"updatedAt\": \"some date\"\n    },\n    {\n        \"id\": 2,\n        \"title\": \"second\",\n        \"content\": \"some text\",\n        \"createdAt\": \"some date\",\n        \"updatedAt\": \"some date\"\n    }\n]"
				},
				{
					"name": "7.GET",
					"originalRequest": {
						"method": "GET",
						"header": [],
						"url": "https://node-task2.herokuapp.com/api/notes/"
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "json",
					"header": [
						{
							"key": "Server",
							"value": "Cowboy"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "X-Powered-By",
							"value": "Express"
						},
						{
							"key": "Content-Type",
							"value": "application/json; charset=utf-8"
						},
						{
							"key": "Content-Length",
							"value": "199"
						},
						{
							"key": "Etag",
							"value": "W/\"c7-SBFGBh+BSdmKqSUIW4VDODIOnaI\""
						},
						{
							"key": "Date",
							"value": "Tue, 06 Jul 2021 22:38:51 GMT"
						},
						{
							"key": "Via",
							"value": "1.1 vegur"
						}
					],
					"cookie": [],
					"body": "[\n    {\n        \"id\": 2,\n        \"title\": \"second\",\n        \"content\": \"some text\",\n        \"createdAt\": \"some date\",\n        \"updatedAt\": \"some date\"\n    },\n    {\n        \"id\": 1,\n        \"title\": \"first changed\",\n        \"content\": \"new text\",\n        \"createdAt\": \"some date\",\n        \"updatedAt\": \"some date\"\n    }\n]"
				},
				{
					"name": "9.GET",
					"originalRequest": {
						"method": "GET",
						"header": [],
						"url": "https://node-task2.herokuapp.com/api/notes/"
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "json",
					"header": [
						{
							"key": "Server",
							"value": "Cowboy"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "X-Powered-By",
							"value": "Express"
						},
						{
							"key": "Content-Type",
							"value": "application/json; charset=utf-8"
						},
						{
							"key": "Content-Length",
							"value": "103"
						},
						{
							"key": "Etag",
							"value": "W/\"67-aR9NxSbB5ab73lSksdIWZNuQyq8\""
						},
						{
							"key": "Date",
							"value": "Tue, 06 Jul 2021 22:40:55 GMT"
						},
						{
							"key": "Via",
							"value": "1.1 vegur"
						}
					],
					"cookie": [],
					"body": "[\n    {\n        \"id\": 1,\n        \"title\": \"first changed\",\n        \"content\": \"new text\",\n        \"createdAt\": \"some date\",\n        \"updatedAt\": \"some date\"\n    }\n]"
				}
			]
		},
		{
			"name": "POST",
			"event": [
				{
					"listen": "prerequest",
					"script": {
						"exec": [
							""
						],
						"type": "text/javascript"
					}
				},
				{
					"listen": "test",
					"script": {
						"exec": [
							""
						],
						"type": "text/javascript"
					}
				}
			],
			"request": {
				"method": "POST",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\"id\": 1, \"title\": \"first\", \"content\": \"some text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": "https://node-task2.herokuapp.com/api/notes/"
			},
			"response": [
				{
					"name": "2.POST",
					"originalRequest": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\"id\": 1, \"title\": \"first\", \"content\": \"some text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						},
						"url": "https://node-task2.herokuapp.com/api/notes/"
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "json",
					"header": [
						{
							"key": "Server",
							"value": "Cowboy"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "X-Powered-By",
							"value": "Express"
						},
						{
							"key": "Content-Type",
							"value": "application/json; charset=utf-8"
						},
						{
							"key": "Content-Length",
							"value": "123"
						},
						{
							"key": "Etag",
							"value": "W/\"7b-Zs+ZSZvDSG55ZK90aBqfAjoxdAg\""
						},
						{
							"key": "Date",
							"value": "Tue, 06 Jul 2021 21:58:17 GMT"
						},
						{
							"key": "Via",
							"value": "1.1 vegur"
						}
					],
					"cookie": [],
					"body": "\"{\\\"id\\\": 1, \\\"title\\\": \\\"first\\\", \\\"content\\\": \\\"some text\\\", \\\"createdAt\\\": \\\"some date\\\", \\\"updatedAt\\\": \\\"some date\\\"}\""
				}
			]
		},
		{
			"name": "POST",
			"request": {
				"method": "POST",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\"id\": 2, \"title\": \"second\", \"content\": \"some text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": "https://node-task2.herokuapp.com/api/notes/"
			},
			"response": [
				{
					"name": "4.POST",
					"originalRequest": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\"id\": 2, \"title\": \"second\", \"content\": \"some text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						},
						"url": "https://node-task2.herokuapp.com/api/notes/"
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "json",
					"header": [
						{
							"key": "Server",
							"value": "Cowboy"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "X-Powered-By",
							"value": "Express"
						},
						{
							"key": "Content-Type",
							"value": "application/json; charset=utf-8"
						},
						{
							"key": "Content-Length",
							"value": "124"
						},
						{
							"key": "Etag",
							"value": "W/\"7c-vtAEN2HlKwhD6OkasvICg9Ni+g0\""
						},
						{
							"key": "Date",
							"value": "Tue, 06 Jul 2021 22:00:49 GMT"
						},
						{
							"key": "Via",
							"value": "1.1 vegur"
						}
					],
					"cookie": [],
					"body": "\"{\\\"id\\\": 2, \\\"title\\\": \\\"second\\\", \\\"content\\\": \\\"some text\\\", \\\"createdAt\\\": \\\"some date\\\", \\\"updatedAt\\\": \\\"some date\\\"}\""
				}
			]
		},
		{
			"name": "PUT",
			"request": {
				"method": "PUT",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\"id\": 1, \"title\": \"first changed\", \"content\": \"new text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": "https://node-task2.herokuapp.com/api/notes/1"
			},
			"response": [
				{
					"name": "6.PUT",
					"originalRequest": {
						"method": "PUT",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\"id\": 1, \"title\": \"first changed\", \"content\": \"new text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						},
						"url": "https://node-task2.herokuapp.com/api/notes/1"
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "json",
					"header": [
						{
							"key": "Server",
							"value": "Cowboy"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "X-Powered-By",
							"value": "Express"
						},
						{
							"key": "Content-Type",
							"value": "application/json; charset=utf-8"
						},
						{
							"key": "Content-Length",
							"value": "130"
						},
						{
							"key": "Etag",
							"value": "W/\"82-QdzTirfdP1+K+iNOkslStk0OPpg\""
						},
						{
							"key": "Date",
							"value": "Tue, 06 Jul 2021 22:03:36 GMT"
						},
						{
							"key": "Via",
							"value": "1.1 vegur"
						}
					],
					"cookie": [],
					"body": "\"{\\\"id\\\": 1, \\\"title\\\": \\\"first changed\\\", \\\"content\\\": \\\"new text\\\", \\\"createdAt\\\": \\\"some date\\\", \\\"updatedAt\\\": \\\"some date\\\"}\""
				}
			]
		},
		{
			"name": "DELETE",
			"request": {
				"method": "DELETE",
				"header": [],
				"url": "https://node-task2.herokuapp.com/api/notes/2"
			},
			"response": [
				{
					"name": "8.DELETE",
					"originalRequest": {
						"method": "DELETE",
						"header": [],
						"url": "https://node-task2.herokuapp.com/api/notes/2"
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "json",
					"header": [
						{
							"key": "Server",
							"value": "Cowboy"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "X-Powered-By",
							"value": "Express"
						},
						{
							"key": "Content-Type",
							"value": "application/json; charset=utf-8"
						},
						{
							"key": "Content-Length",
							"value": "23"
						},
						{
							"key": "Etag",
							"value": "W/\"17-bCXlhEBJSVIeQ+m1i+6p7+rrNak\""
						},
						{
							"key": "Date",
							"value": "Tue, 06 Jul 2021 22:40:08 GMT"
						},
						{
							"key": "Via",
							"value": "1.1 vegur"
						}
					],
					"cookie": [],
					"body": "{\n    \"success\": true,\n    \"id\": 2\n}"
				}
			]
		}
	]
};

const expectedOutput = {
	"name": "CRUD",
	"uid": "mockeduuidvalue123456",
	"version": "1",
	"items": [
		{
			"uid": "mockeduuidvalue123456",
			"name": "GET",
			"type": "http-request",
			"request": {
				"url": "https://node-task2.herokuapp.com/api/notes/",
				"method": "GET",
				"auth": {
					"mode": "none",
					"basic": null,
					"bearer": null,
					"awsv4": null
				},
				"headers": [],
				"params": [],
				"body": {
					"mode": "none",
					"json": null,
					"text": null,
					"xml": null,
					"formUrlEncoded": [],
					"multipartForm": []
				},
				"docs": ""
			},
			"seq": 1
		},
		{
			"uid": "mockeduuidvalue123456",
			"name": "POST",
			"type": "http-request",
			"request": {
				"url": "https://node-task2.herokuapp.com/api/notes/",
				"method": "POST",
				"auth": {
					"mode": "none",
					"basic": null,
					"bearer": null,
					"awsv4": null
				},
				"headers": [],
				"params": [],
				"body": {
					"mode": "json",
					"json": "{\"id\": 1, \"title\": \"first\", \"content\": \"some text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
					"text": null,
					"xml": null,
					"formUrlEncoded": [],
					"multipartForm": []
				},
				"docs": "",
				"script": {
					"req": ""
				},
				"tests": ""
			},
			"seq": 2
		},
		{
			"uid": "mockeduuidvalue123456",
			"name": "POST_1",
			"type": "http-request",
			"request": {
				"url": "https://node-task2.herokuapp.com/api/notes/",
				"method": "POST",
				"auth": {
					"mode": "none",
					"basic": null,
					"bearer": null,
					"awsv4": null
				},
				"headers": [],
				"params": [],
				"body": {
					"mode": "json",
					"json": "{\"id\": 2, \"title\": \"second\", \"content\": \"some text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
					"text": null,
					"xml": null,
					"formUrlEncoded": [],
					"multipartForm": []
				},
				"docs": ""
			},
			"seq": 3
		},
		{
			"uid": "mockeduuidvalue123456",
			"name": "PUT",
			"type": "http-request",
			"request": {
				"url": "https://node-task2.herokuapp.com/api/notes/1",
				"method": "PUT",
				"auth": {
					"mode": "none",
					"basic": null,
					"bearer": null,
					"awsv4": null
				},
				"headers": [],
				"params": [],
				"body": {
					"mode": "json",
					"json": "{\"id\": 1, \"title\": \"first changed\", \"content\": \"new text\", \"createdAt\": \"some date\", \"updatedAt\": \"some date\"}",
					"text": null,
					"xml": null,
					"formUrlEncoded": [],
					"multipartForm": []
				},
				"docs": ""
			},
			"seq": 4
		},
		{
			"uid": "mockeduuidvalue123456",
			"name": "DELETE",
			"type": "http-request",
			"request": {
				"url": "https://node-task2.herokuapp.com/api/notes/2",
				"method": "DELETE",
				"auth": {
					"mode": "none",
					"basic": null,
					"bearer": null,
					"awsv4": null
				},
				"headers": [],
				"params": [],
				"body": {
					"mode": "none",
					"json": null,
					"text": null,
					"xml": null,
					"formUrlEncoded": [],
					"multipartForm": []
				},
				"docs": ""
			},
			"seq": 5
		}
	],
	"environments": [],
	"root": {
		"docs": "",
		"meta": {
			"name": "CRUD"
		},
		"request": {
			"auth": {
				"mode": "none",
				"basic": null,
				"bearer": null,
				"awsv4": null
			},
			"headers": [],
			"script": {},
			"tests": "",
			"vars": {}
		}
	}
};