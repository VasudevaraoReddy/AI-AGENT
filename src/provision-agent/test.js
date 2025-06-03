"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = require("axios");
var fs = require("fs");
var path = require("path");
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        var tests, resultsDir, _i, tests_1, test_1, response, timestamp, resultFile, testResult, error_1, timestamp, errorFile, errorResult;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    tests = [
                        {
                            name: "Regular query without form data",
                            payload: {
                                message: "I want to deploy an EC2 instance on AWS"
                            }
                        },
                        {
                            name: "EC2 deployment with form data",
                            payload: {
                                message: "Deploy an EC2 instance",
                                formData: {
                                    instanceType: "t2.micro",
                                    amiId: "ami-0c55b159cbfafe1f0",
                                    keyName: "my-key-pair",
                                    instanceName: "test-instance",
                                    region: "us-east-1",
                                    securityGroupIds: ["sg-12345"]
                                },
                                userId: "test-user-123",
                                csp: "AWS",
                                serviceName: "EC2"
                            }
                        },
                        {
                            name: "S3 bucket creation with form data",
                            payload: {
                                message: "Create an S3 bucket",
                                formData: {
                                    bucketName: "my-test-bucket-123",
                                    region: "us-east-1",
                                    accessControl: "Private",
                                    versioning: true
                                },
                                userId: "test-user-123",
                                csp: "AWS",
                                serviceName: "S3"
                            }
                        },
                        {
                            name: "Service configuration query",
                            payload: {
                                message: "What configuration is needed for an EC2 instance?"
                            }
                        },
                        {
                            name: "Azure VM deployment with form data",
                            payload: {
                                message: "Deploy a Virtual Machine in Azure",
                                formData: {
                                    vmSize: "Standard_B1s",
                                    vmName: "test-vm",
                                    region: "eastus",
                                    imagePublisher: "Canonical",
                                    imageOffer: "UbuntuServer",
                                    imageSku: "18.04-LTS"
                                },
                                userId: "test-user-123",
                                csp: "Azure",
                                serviceName: "Virtual Machine"
                            }
                        }
                    ];
                    resultsDir = path.join(__dirname, 'test-results');
                    if (!fs.existsSync(resultsDir)) {
                        fs.mkdirSync(resultsDir);
                    }
                    _i = 0, tests_1 = tests;
                    _b.label = 1;
                case 1:
                    if (!(_i < tests_1.length)) return [3 /*break*/, 6];
                    test_1 = tests_1[_i];
                    console.log("\nRunning test: ".concat(test_1.name));
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, axios_1.default.post('http://localhost:3001/run-provision-agent', test_1.payload)];
                case 3:
                    response = _b.sent();
                    timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    resultFile = path.join(resultsDir, "".concat(test_1.name.replace(/\s+/g, '-'), "_").concat(timestamp, ".json"));
                    testResult = {
                        testName: test_1.name,
                        timestamp: new Date().toISOString(),
                        request: test_1.payload,
                        response: response.data,
                        success: true
                    };
                    fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));
                    console.log('✅ Test passed');
                    console.log('Response:', JSON.stringify(response.data, null, 2));
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _b.sent();
                    console.error('❌ Test failed:', error_1.message);
                    if (error_1.response) {
                        console.error('Error response:', error_1.response.data);
                    }
                    timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    errorFile = path.join(resultsDir, "".concat(test_1.name.replace(/\s+/g, '-'), "_").concat(timestamp, "_error.json"));
                    errorResult = {
                        testName: test_1.name,
                        timestamp: new Date().toISOString(),
                        request: test_1.payload,
                        error: {
                            message: error_1.message,
                            response: (_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data
                        },
                        success: false
                    };
                    fs.writeFileSync(errorFile, JSON.stringify(errorResult, null, 2));
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// Run the tests
console.log('Starting provision agent tests...');
runTests().then(function () {
    console.log('\nAll tests completed');
}).catch(function (error) {
    console.error('Error running tests:', error);
});
