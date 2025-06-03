import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function runTests() {
    const tests = [
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

    // Create results directory if it doesn't exist
    const resultsDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
    }

    for (const test of tests) {
        console.log(`\nRunning test: ${test.name}`);
        try {
            const response = await axios.post('http://localhost:3001/run-provision-agent', test.payload);
            
            // Save test results
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const resultFile = path.join(resultsDir, `${test.name.replace(/\s+/g, '-')}_${timestamp}.json`);
            
            const testResult = {
                testName: test.name,
                timestamp: new Date().toISOString(),
                request: test.payload,
                response: response.data,
                success: true
            };

            fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));
            
            console.log('✅ Test passed');
            console.log('Response:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            if (error.response) {
                console.error('Error response:', error.response.data);
            }
            
            // Save error results
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const errorFile = path.join(resultsDir, `${test.name.replace(/\s+/g, '-')}_${timestamp}_error.json`);
            
            const errorResult = {
                testName: test.name,
                timestamp: new Date().toISOString(),
                request: test.payload,
                error: {
                    message: error.message,
                    response: error.response?.data
                },
                success: false
            };

            fs.writeFileSync(errorFile, JSON.stringify(errorResult, null, 2));
        }
    }
}

// Run the tests
console.log('Starting provision agent tests...');
runTests().then(() => {
    console.log('\nAll tests completed');
}).catch(error => {
    console.error('Error running tests:', error);
}); 