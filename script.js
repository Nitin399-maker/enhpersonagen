// Import the bootstrap-llm-provider library
import { openaiConfig } from "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1";

// Global variables to store data
let personas = [];
let surveyResults = [];
let surveyQuestions = [];
let surveyOptions = [];
let charts = [];
let generatedCode = '';
let llmConfig = null; // Store LLM configuration

// DOM elements and initialization
document.addEventListener('DOMContentLoaded', function() {
    const segmentSelect = document.getElementById('segmentSelect');
    const segmentPrompt = document.getElementById('segmentPrompt');
    const fieldsList = document.getElementById('fieldsList');
    let segmentData = {};
    
    // Load JSON file - with fallback default data if segments.json is not available
    fetch('segments.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('segments.json not found');
            }
            return response.json();
        })
        .then(data => {
            segmentData = data;
            loadSegmentData();
        })
        .catch(error => {
            console.warn('segments.json not found, using default data');
            // Default segment data
            segmentData = {
                segment1: {
                    description: "Value-seeking commuters who prioritize cost-effectiveness and convenience in their daily fuel purchases. They are price-conscious consumers who compare fuel prices across different stations and often use apps or loyalty programs to find the best deals. They typically refuel during regular commuting hours and prefer locations that are convenient to their daily routes.",
                    fields: "Name\nAge\nGender\nOccupation\nIncome Level\nVehicle Type\nDaily Commute Distance\nFuel Budget per Month\nPreferred Fuel Station Brand\nUses Fuel Apps\nLoyalty Program Member"
                },
                segment2: {
                    description: "Brand-loyal motorists who consistently choose specific fuel station brands based on trust, quality perception, and brand reputation. They value consistent service quality and are willing to pay slightly more for their preferred brand. They often have premium vehicles and choose premium fuel options.",
                    fields: "Name\nAge\nGender\nOccupation\nIncome Level\nVehicle Type\nPreferred Brand\nYears of Brand Loyalty\nFuel Type Preference\nService Expectations\nWillingness to Pay Premium"
                },
                segment3: {
                    description: "Independent tradespeople and business owners who require reliable fuel services for their work vehicles. They often purchase fuel in larger quantities, need convenient payment options, and value additional services like vehicle maintenance. They prioritize efficiency and reliability over price.",
                    fields: "Name\nAge\nGender\nBusiness Type\nFleet Size\nMonthly Fuel Expense\nPayment Method Preference\nRequires Additional Services\nRefueling Frequency\nLocation Requirements"
                },
                segment4: {
                    description: "DIY car enthusiasts who are knowledgeable about vehicle maintenance and fuel quality. They often have performance vehicles or classic cars and are concerned about fuel quality and additives. They may perform their own maintenance and are interested in specialized products.",
                    fields: "Name\nAge\nGender\nVehicle Type\nMaintenance Knowledge Level\nFuel Quality Concerns\nPerformance Modifications\nFrequency of Vehicle Projects\nPreferred Fuel Octane\nUses Fuel Additives"
                }
            };
            loadSegmentData();
        });

    function loadSegmentData() {
        // Populate default
        const selectedSegment = segmentData[segmentSelect.value];
        segmentPrompt.value = selectedSegment.description;
        fieldsList.value = selectedSegment.fields;
        
        // Handle segment changes
        segmentSelect.addEventListener('change', () => {
            const selectedSegment = segmentData[segmentSelect.value];
            segmentPrompt.value = selectedSegment.description;
            fieldsList.value = selectedSegment.fields;
        });
    }
    
    // Hide sections initially
    document.getElementById('generatedCodeSection').style.display = 'none';
    document.getElementById('personasSection').style.display = 'none';
    
    // Initialize sliders with their display values
    document.getElementById('numPersonas').addEventListener('input', function() {
        document.getElementById('numPersonasValue').textContent = this.value;
    });
    
    document.getElementById('personaTemperature').addEventListener('input', function() {
        document.getElementById('personaTemperatureValue').textContent = this.value;
    });
    
    document.getElementById('surveyParticipants').addEventListener('input', function() {
        document.getElementById('surveyParticipantsValue').textContent = this.value;
    });
    
    document.getElementById('surveyTemperature').addEventListener('input', function() {
        document.getElementById('surveyTemperatureValue').textContent = this.value;
    });
    
    // Configure LLM Provider button
    document.getElementById('configureLlmBtn').addEventListener('click', configureLlmProvider);
    
    // Button event listeners
    document.getElementById('generateCodeBtn').addEventListener('click', async function() {
        await generatePersonaCode();
        document.getElementById('generatedCodeSection').style.display = 'block';
        // Scroll to generated code section
        document.getElementById('generatedCodeSection').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('executeCodeBtn').addEventListener('click', async function() {
        await executePersonaCode();
        document.getElementById('personasSection').style.display = 'block';
        // Scroll to personas section
        document.getElementById('personasSection').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('downloadPersonasBtn').addEventListener('click', () => {
    downloadCsv(personas, 'synthetic_personas.csv', "No personas to download");});
    document.getElementById('nextToSurveyBtn').addEventListener('click', () => {
        document.querySelector('#mainTabs button[data-bs-target="#survey"]').click();
    });
    
    document.getElementById('runSurveyBtn').addEventListener('click', runSurvey);
    document.getElementById('downloadSurveyBtn').addEventListener('click', downloadSurveyJson);
    document.getElementById('downloadSurveyCsvBtn').addEventListener('click', () => {
    downloadCsv(surveyResults, 'survey_results.csv', "No survey results to download");});
    document.getElementById('nextToResultsBtn').addEventListener('click', () => {
        document.querySelector('#mainTabs button[data-bs-target="#results"]').click();
        renderCharts();
    });
    
    document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
    document.getElementById('downloadResultsBtn').addEventListener('click', () => {
    downloadCsv(surveyResults, 'complete_survey_results.csv', "No results to download");});
    
    // Initialize LLM configuration on page load
    initializeLlmConfig();
});

// LLM Provider Configuration
async function configureLlmProvider() {
    try {
        llmConfig = await openaiConfig({
            show: true,
            defaultBaseUrls: [
                "https://llmfoundry.straivedemo.com/openai/v1",
                "https://llmfoundry.straive.com/openai/v1",,
                "https://aipipe.org/api/v1",
                "https://openrouter.ai/api/v1",
                "https://api.openai.com/v1"
            ],
            title: "Configure LLM Provider",
            baseURLLabel: "API Base URL",
            apiKeyLabel: "API Key",
            buttonLabel: "Save & Test Connection"
        });
        
        updateProviderStatus(true);
        updateModelSelects();
        enableButtons();
    } catch (error) {
        console.error('LLM configuration failed:', error);
        showError(`Failed to configure LLM provider: ${error.message}`);
        updateProviderStatus(false);
    }
}

async function initializeLlmConfig() {
    try {
        // Try to get existing config without showing modal
        llmConfig = await openaiConfig({
            show: false,
            defaultBaseUrls: [
                "https://llmfoundry.straivedemo.com/openai/v1",
                "https://llmfoundry.straive.com/openai/v1",
                "https://aipipe.org/api/v1",
                "https://openrouter.ai/api/v1",
                "https://api.openai.com/v1"
            ]
        });
        
        updateProviderStatus(true);
        updateModelSelects();
        enableButtons();
    } catch (error) {
        // No existing config or config invalid - user needs to configure
        updateProviderStatus(false);
        updateModelSelects();
    }
}

function updateProviderStatus(isConfigured) {
    const statusElement = document.getElementById('providerStatus');
    if (isConfigured && llmConfig) {
        statusElement.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
        statusElement.title = `Connected to ${llmConfig.baseURL}`;
    } else {
        statusElement.innerHTML = '<i class="bi bi-x-circle-fill text-danger"></i>';
        statusElement.title = 'LLM Provider not configured';
    }
}

function updateModelSelects() {
    const personaModelSelect = document.getElementById('modelSelect');
    const surveyModelSelect = document.getElementById('surveyModelSelect');
    
    if (llmConfig && llmConfig.models && llmConfig.models.length > 0) {
        console.log('Available models:', llmConfig.models); // Debug log
        
        // Handle different API response formats
        let modelOptions = '';
        
        llmConfig.models.forEach(model => {
            let modelId = '';
            let modelName = '';
            
            // Handle different model object structures
            if (typeof model === 'string') {
                // Simple string array
                modelId = model;
                modelName = model;
            } else if (model && model.id) {
                // Object with id property
                modelId = model.id;
                modelName = model.name || model.id;
            } else if (model && model.model) {
                // Object with model property (some APIs use this)
                modelId = model.model;
                modelName = model.name || model.model;
            }
            
            if (modelId) {
                modelOptions += `<option value="${modelId}">${modelName}</option>`;
            }
        });
        
        if (modelOptions) {
            personaModelSelect.innerHTML = modelOptions;
            
            // For survey, try to filter for models that typically support structured output
            // If no suitable models found, use all models
            let surveyModelOptions = '';
            
            llmConfig.models.forEach(model => {
                let modelId = '';
                let modelName = '';
                
                if (typeof model === 'string') {
                    modelId = model;
                    modelName = model;
                } else if (model && model.id) {
                    modelId = model.id;
                    modelName = model.name || model.id;
                } else if (model && model.model) {
                    modelId = model.model;
                    modelName = model.name || model.model;
                }
                
                if (modelId) {
                    // Check if this model likely supports structured output
                    const isCompatible = 
                        modelId.includes('gpt') || 
                        modelId.includes('gemini') ||
                        modelId.includes('claude') ||
                        modelId.includes('openai') ||
                        !modelId.includes('vision') ||
                        !modelId.includes('whisper') ||
                        !modelId.includes('tts') ||
                        !modelId.includes('dall-e');
                    
                    if (isCompatible) {
                        surveyModelOptions += `<option value="${modelId}">${modelName}</option>`;
                    }
                }
            });
            
            // If no compatible models found, use all models
            surveyModelSelect.innerHTML = surveyModelOptions || modelOptions;
        } else {
            personaModelSelect.innerHTML = '<option value="">No models available</option>';
            surveyModelSelect.innerHTML = '<option value="">No models available</option>';
        }
    } else {
        console.log('No models in config:', llmConfig); // Debug log
        personaModelSelect.innerHTML = '<option value="">Configure LLM Provider first</option>';
        surveyModelSelect.innerHTML = '<option value="">Configure LLM Provider first</option>';
    }
}

function enableButtons() {
    const hasConfig = llmConfig && llmConfig.baseURL && llmConfig.apiKey;
    // Enable/disable buttons based on configuration
    // The generateCodeBtn will be enabled if we have LLM config
    // Other buttons depend on previous steps being completed
}

// Generic OpenAI API call function
async function callOpenAIAPI(messages, temperature = 1, responseFormat = null) {
    if (!llmConfig) {
        throw new Error('LLM provider not configured. Please configure it first.');
    }
    
    const model = responseFormat ? 
        document.getElementById('surveyModelSelect').value : 
        document.getElementById('modelSelect').value;
    
    if (!model) {
        throw new Error('Please select a model');
    }
    
    const requestBody = {
        model: model,
        temperature: temperature,
        messages: messages
    };
    
    if (responseFormat) {
        requestBody.response_format = responseFormat;
    }
    
    const response = await fetch(`${llmConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${llmConfig.apiKey}`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'Synthetic Persona Survey'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }
    
    return await response.json();
}

// STEP 1: Generate Persona Code
async function generatePersonaCode() {
    try {
        if (!llmConfig) {
            showError("Please configure your LLM provider first");
            return;
        }
        
        const segmentPrompt = document.getElementById('segmentPrompt').value;
        const fieldsList = document.getElementById('fieldsList').value.split('\n').filter(line => line.trim() !== '');
        const numPersonas = parseInt(document.getElementById('numPersonas').value);
        const temperature = parseFloat(document.getElementById('personaTemperature').value);
        
        // Show progress indicator
        const progressBar = document.getElementById('generationProgress');
        progressBar.classList.remove('d-none');
        const progressBarInner = progressBar.querySelector('.progress-bar');
        progressBarInner.style.width = '50%';
        progressBarInner.textContent = 'Generating code...';
        
        // Prepare prompt for the LLM
        const prompt = `
        Write a JavaScript code to generate REALISTIC fake data of ${numPersonas} rows of persona based on the following profile and fields provided
        When listing possible values for fields, go beyond the examples above to be FULLY comprehensive.
        When picking values, use realistic distributions for each value based on real-life.
        <PROFILE>
        ${segmentPrompt}
        </PROFILE>
        <FIELDS>
        These are the fields I need for each persona:
        ${fieldsList.join('\n')}
        </FIELDS>
        
        Please provide ONLY JavaScript code that:
        1. Defines a function called generatePersonas() that returns an array of ${numPersonas} persona objects
        2. Creates realistic, diverse data that matches the segment profile
        3. Properly uses randomization to create natural distributions of values
        4. Returns the data as an array of JSON objects, with each field as a key-value pair
        The returned code should be ready to execute in a browser environment. 
        DO NOT include any explanation text outside the JavaScript code itself.
        `;
        
        // Call the API
        const data = await callOpenAIAPI([
            { role: "user", content: prompt }
        ], temperature);
        
        const content = data.choices[0].message.content;
        
        // Extract code from response
        let code = content;
        
        // Check if the response is wrapped in backticks or has JS markdown
        const codeMatch = content.match(/```javascript\s*([\s\S]*?)\s*```/) || 
                          content.match(/```js\s*([\s\S]*?)\s*```/) || 
                          content.match(/```\s*([\s\S]*?)\s*```/);
        
        if (codeMatch) {
            code = codeMatch[1];
        }
        
        // Display the code
        generatedCode = code;
        document.getElementById('generatedCode').textContent = code;
        
        // Update progress
        progressBarInner.style.width = '100%';
        progressBarInner.textContent = 'Code generated';
        // Hide the progress bar after a short delay
        setTimeout(() => {
            progressBar.style.display = 'none';
        }, 1000);
        
        // Enable execute button
        document.getElementById('executeCodeBtn').disabled = false;
        
    } catch (error) {
        console.error("Error generating code:", error);
        showError(`Error generating code: ${error.message}`);
        const progressBar = document.getElementById('generationProgress');
        progressBar.classList.add('d-none');
    }
}

function executePersonaCode() {
    try {
        // Show progress
        const progressBar = document.getElementById('generationProgress1');
        progressBar.classList.remove('d-none');
        const progressBarInner = progressBar.querySelector('.progress-bar');
        progressBarInner.style.width = '50%';
        progressBarInner.textContent = 'Executing code...';
        
        // Clear any previous personas
        personas = [];
        
        // Create a safe function execution environment
        const executeCode = new Function(`
            try {
                ${generatedCode}
                return { success: true, result: generatePersonas() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        `);
        
        // Execute the code
        const result = executeCode();
        
        if (!result.success) {
            throw new Error(`Code execution failed: ${result.error}`);
        }
        
        // Update personas with the result
        personas = result.result;
        
        if (!Array.isArray(personas) || personas.length === 0) {
            throw new Error("Code execution did not return an array of personas");
        }
        
        // Update progress
        progressBarInner.style.width = '100%';
        progressBarInner.textContent = `${personas.length} personas generated`;
        // Hide the progress bar after a short delay
        setTimeout(() => {
            progressBar.style.display = 'none';
        }, 1000);
        
        // Display personas in the table
        displayPersonas();
        
        // Enable next steps
        document.getElementById('downloadPersonasBtn').disabled = false;
        document.getElementById('nextToSurveyBtn').disabled = false;
        document.getElementById('runSurveyBtn').disabled = false;
        
    } catch (error) {
        console.error("Error executing code:", error);
        showError(`Error executing code: ${error.message}`);
        const progressBar = document.getElementById('generationProgress1');
        progressBar.classList.add('d-none');
    }
}

function displayPersonas() {
    if (personas.length === 0) {
        return;
    }
    
    const tableHeader = document.getElementById('personaTableHeader');
    const tableBody = document.getElementById('personaTableBody');
    const personaCount = document.getElementById('personaCount');
    
    // Update persona count
    personaCount.textContent = personas.length;
    
    // Clear existing content
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Add header row
    const fields = Object.keys(personas[0]);
    fields.forEach(field => {
        const th = document.createElement('th');
        th.textContent = field;
        tableHeader.appendChild(th);
    });
    
    // Add data rows
    personas.forEach((persona, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-index', index);
        
        fields.forEach(field => {
            const td = document.createElement('td');
            td.textContent = persona[field];
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
}

function downloadCsv(data, filename, errorMessage) {
    if (!data || data.length === 0) {
        showError(errorMessage || "No data to download");
        return;
    }
    
    const fields = Object.keys(data[0]);
    const csvContent = [
        fields.join(','), // Header row
        ...data.map(item => 
            fields.map(field => {
                // Properly escape CSV values
                let value = item[field] || '';
                // Convert to string if it's not already
                if (typeof value !== 'string') {
                    value = String(value);
                }
                // If value contains commas, quotes, or newlines, wrap in quotes
                if (/[",\n\r]/.test(value)) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// STEP 2: Run Survey
function parseQuestions() {
    const questionsText = document.getElementById('surveyQuestions').value;
    const questionLines = questionsText.split('\n').filter(line => line.trim() !== '');
    
    // Clear previous values from global variables
    surveyQuestions = [];
    surveyOptions = [];
    questionLines.forEach(line => {
        let question = line.trim();
        let options = [];
        // Check for options in parentheses with or without italics: _(Options)_ or (Options)
        const parenthesesMatch = line.match(/[\(_]([^)]+)[\)_]/);
        if (parenthesesMatch) {
            // Extract options from parentheses
            const optionsText = parenthesesMatch[1].trim();
            options = optionsText.split(/\s*\/\s*|\s*,\s*/).map(opt => opt.trim()).filter(opt => opt);
            
            // Remove the options part from the question
            question = line.replace(/\s*[\(_]([^)]+)[\)_]\s*/, '').trim();
        } 
        // Check for question mark format
        else if (line.includes('?')) {
            const parts = line.split('?');
            question = parts[0].trim() + '?';
            
            // If there's content after the question mark, try to parse options
            if (parts.length >= 2) {
                const optionsText = parts.slice(1).join('?').trim();
                if (optionsText) {
                    options = optionsText.split(/\s*\/\s*|\s*,\s*/).map(opt => opt.trim()).filter(opt => opt);
                }
            }
        }
        // Check for colon format
        else if (line.includes(':')) {
            const colonParts = line.split(':');
            question = colonParts[0].trim();
            
            const optionsText = colonParts.slice(1).join(':').trim();
            if (optionsText) {
                options = optionsText.split(/\s*\/\s*|\s*,\s*/).map(opt => opt.trim()).filter(opt => opt);
            }
        }
        // Check for scale format (e.g., "1-5 scale" or "1–5 scale")
        const scaleMatch = line.match(/\(?\s*(\d+[\-–]\d+)\s+scale\s*\)?/i);
        if (scaleMatch) {
            const scaleParts = scaleMatch[1].split(/[\-–]/);
            const min = parseInt(scaleParts[0]);
            const max = parseInt(scaleParts[1]);
            
            // Generate options for the scale
            options = Array.from({length: max - min + 1}, (_, i) => (i + min).toString());
            
            // Clean up the question by removing the scale part
            question = line.replace(/\s*\(?\s*\d+[\-–]\d+\s+scale\s*\)?\s*/i, '').trim();
        }
        surveyQuestions.push(question);
        surveyOptions.push(options);
    });
    return { surveyQuestions, surveyOptions };
}

function generateJsonSchema() {
    const { surveyQuestions, surveyOptions } = parseQuestions();
    
    if (surveyQuestions.length === 0) {
        showError("Please enter valid survey questions");
        return null;
    }
    
    // Create a JSON schema
    const schema = {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
    };
    
    surveyQuestions.forEach((question, index) => {
        const questionId = `question_${index + 1}`;
        const options = surveyOptions[index];
        
        schema.properties[questionId] = {
            type: "string",
            description: question,
            enum: options
        };
        
        // Add reasoning field
        schema.properties[`${questionId}_reasoning`] = {
            type: "string",
            description: `Reasoning for ${question}`
        };
        
        // Add both to required fields
        schema.required.push(questionId);
        schema.required.push(`${questionId}_reasoning`);
    });
    
    // Display the schema
    const jsonSchemaDisplay = document.getElementById('jsonSchemaDisplay');
    jsonSchemaDisplay.textContent = JSON.stringify(schema, null, 2);
    
    return schema;
}

async function runSurvey() {
    try {
        if (personas.length === 0) {
            showError("Please generate personas first");
            return;
        }
        
        if (!llmConfig) {
            showError("Please configure your LLM provider first");
            return;
        }
        
        // Parse survey questions and generate schema
        const { surveyQuestions: questions, surveyOptions: options } = parseQuestions();
        surveyQuestions = questions; // Update global variable
        surveyOptions = options; // Update global variable
        
        const schema = generateJsonSchema();
        if (!schema) return;
        
        const numParticipants = Math.min(
            parseInt(document.getElementById('surveyParticipants').value),
            personas.length
        );
        const temperature = parseFloat(document.getElementById('surveyTemperature').value);
        
        // Select random participants without duplicates
        const selectedIndices = selectRandomIndices(personas.length, numParticipants);
        const participants = selectedIndices.map(index => personas[index]);
        
        // Show progress
        const progressBar = document.getElementById('surveyProgress');
        progressBar.classList.remove('d-none');
        const progressBarInner = progressBar.querySelector('.progress-bar');
        progressBarInner.style.width = '0%';
        progressBarInner.textContent = 'Starting survey...';
        
        // Disable the run button during survey
        document.getElementById('runSurveyBtn').disabled = true;
        
        // Clear previous results
        surveyResults = [];
        document.getElementById('surveyResultsPreview').innerHTML = '';
        document.getElementById('responseCount').textContent = '0';
        
        // Process each participant
        for (let i = 0; i < participants.length; i++) {
            const persona = participants[i];
            
            // Update progress
            const progress = Math.round(((i + 1) / participants.length) * 100);
            progressBarInner.style.width = `${progress}%`;
            progressBarInner.textContent = `Processed ${i + 1} of ${participants.length} (${progress}%)`;
            if(i==participants.length-1){
                setTimeout(() => {
                        progressBar.style.display = 'none';
                }, 1000);
            }
            
            // Create a system prompt describing the persona
            const personaDescription = Object.entries(persona)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            
            const systemPrompt = `You are a survey participant with the following profile:\n${personaDescription}\n\n
Your task is to answer survey questions authentically as this specific person would respond.
IMPORTANT: Your profile should strongly influence your choices. Different personas should have different preferences.
- People with different backgrounds and values will naturally choose different options
- Don't pick what you think is objectively "best" - pick what YOUR CHARACTER would choose
- Be true to the psychological traits, values, and background of your persona`;
            
            // Create questions prompt
            const questionsPrompt = surveyQuestions.map((q, idx) => 
                `${q} (Choose one: ${surveyOptions[idx].join(', ')})`
            ).join('\n\n');
            
            // Build structured response format
            const responseFormat = {
            type: "json_schema",
            json_schema: {
                name: "surveyResponse",
                strict: true,
                schema: schema
            }
            };
            
            // Call the API using our generic function
            const data = await callOpenAIAPI([
                { role: "system", content: systemPrompt },
                { role: "user", content: `Please answer the following survey questions by choosing one of the options(enum). For each answer, provide a detailed reasoning explaining WHY you selected that option based on your persona's characteristics. you must respond with valid JSON only, that must use double quotes for all keys and string values, include commas between all key-value pairs, contain no trailing commas with no extra text or markdown outside the JSON object, it must have same keys that is defined in the schema, include all required fields.\n\n Questions:\n${questionsPrompt}` }
            ], temperature, responseFormat);
            
            const content = data.choices[0].message.content;
            
            // Parse the JSON response
            let answerData;
            try {
                answerData = JSON.parse(content);
            } catch (e) {
                // If direct parsing fails, try to extract JSON from the response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    answerData = JSON.parse(jsonMatch[0]);
                } else {
                    console.warn(`Could not parse JSON for participant ${i+1}. Skipping.`);
                    continue;
                }
            }
            
            // Combine persona data with survey responses
            const result = {
                participant_id: i + 1,
                ...persona,
                ...answerData
            };
            
            surveyResults.push(result);
            
            // Update response count
            document.getElementById('responseCount').textContent = surveyResults.length.toString();
            
            const resultsPreview = document.getElementById('surveyResultsPreview');
            const resultDiv = document.createElement('div');
            resultDiv.className = 'card mb-2';
            resultDiv.innerHTML = `
                <div class="card-header bg-light">
                    Participant ${i + 1}
                </div>
                <div class="card-body">
                    <pre style="font-size: 12px;">${JSON.stringify(answerData, null, 2)}</pre>
                </div>
            `;
            resultsPreview.appendChild(resultDiv);
        }
        
        // Re-enable the run button
        document.getElementById('runSurveyBtn').disabled = false;
        
        // Enable next steps
        document.getElementById('downloadSurveyBtn').disabled = false;
        document.getElementById('downloadSurveyCsvBtn').disabled = false;
        document.getElementById('nextToResultsBtn').disabled = false;
        document.getElementById('downloadResultsBtn').disabled = false;
        
    } catch (error) {
        console.error("Error running survey:", error);
        showError(`Error running survey: ${error.message}`);
        document.getElementById('runSurveyBtn').disabled = false;
        const progressBar = document.getElementById('surveyProgress');
        progressBar.classList.add('d-none');
    }
}

function selectRandomIndices(max, count) {
    // Function to randomly select 'count' indices from 0 to max-1 without duplicates
    const indices = Array.from({ length: max }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    // Take the first 'count' elements
    return indices.slice(0, count);
}

function downloadSurveyJson() {
    if (surveyResults.length === 0) {
        showError("No survey results to download");
        return;
    }
    
    // Create and trigger download
    const jsonContent = JSON.stringify(surveyResults, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'survey_results.json');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// STEP 3: Results Analysis and Visualization
function renderCharts() {
    if (surveyResults.length === 0) {
        showError("No survey results to display");
        return;
    }
    
    // Make sure we have the questions and options properly defined
    if (surveyQuestions.length === 0 || surveyOptions.length === 0) {
        // If not already defined, try to parse them from the form
        const { surveyQuestions: questions, surveyOptions: options } = parseQuestions();
        surveyQuestions = questions;
        surveyOptions = options;
    }
    
    // Clear existing charts
    const chartsContainer = document.getElementById('chartsContainer');
    chartsContainer.innerHTML = '';
    charts.forEach(chart => chart.destroy());
    charts = [];
    
    // Get question keys (excluding reasoning fields)
    const questionKeys = Object.keys(surveyResults[0])
        .filter(key => key.startsWith('question_') && !key.includes('_reasoning'));
    
    // Create charts for each question
    questionKeys.forEach((questionKey, index) => {
        // Get the question text
        const questionText = surveyQuestions[index];
        
        // Count responses for each option
        const responses = {};
        surveyResults.forEach(result => {
            const answer = result[questionKey];
            responses[answer] = (responses[answer] || 0) + 1;
        });
        
        // Create a column in the charts container
        const chartCol = document.createElement('div');
        chartCol.className = 'mb-4';
        
        // Create a card for the chart
        const chartCard = document.createElement('div');
        chartCard.className = 'card h-100';
        
        // Create card header with question text
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.textContent = questionText;
        
        // Create card body for the chart
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        // Create canvas for Chart.js
        const canvas = document.createElement('canvas');
        canvas.id = `chart-${questionKey}`;
        
        // Add elements to the DOM
        cardBody.appendChild(canvas);
        chartCard.appendChild(cardHeader);
        chartCard.appendChild(cardBody);
        chartCol.appendChild(chartCard);
        chartsContainer.appendChild(chartCol);
        
        // Create the chart
        const ctx = canvas.getContext('2d');
        const options = surveyOptions[index];
        
        // Ensure options are in the same order as defined in the survey
        const chartData = options.map(option => responses[option] || 0);
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: options,
                datasets: [{
                    label: 'Responses',
                    data: chartData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)'
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Responses'
                        }
                    }
                }
            }
        });
        
        charts.push(chart);
    });
    
    // Generate filter controls and data table
    generateFilters();
    populateResultsTable();
}

function generateFilters() {
    if (surveyResults.length === 0) return;
    
    const filterControls = document.getElementById('filterControls');
    filterControls.innerHTML = '';
    
    // Get all persona fields (excluding survey questions and reasoning fields)
    const personaFields = Object.keys(surveyResults[0]).filter(key => 
        !key.startsWith('question_') && key !== 'participant_id'
    );
    
    // Create filter dropdowns for categorical fields
    personaFields.forEach(field => {
        // Get unique values for this field
        const uniqueValues = [...new Set(surveyResults.map(result => result[field]))];
        
        // Skip fields with too many unique values or numeric IDs
        if (uniqueValues.length > 15 || field === 'ID') return;
        
        // Create filter control
        const filterCol = document.createElement('div');
        filterCol.className = 'mb-3';
        
        const filterLabel = document.createElement('label');
        filterLabel.className = 'form-label';
        filterLabel.textContent = field;
        filterLabel.setAttribute('for', `filter-${field}`);
        
        const filterSelect = document.createElement('select');
        filterSelect.className = 'form-select filter-control';
        filterSelect.id = `filter-${field}`;
        filterSelect.setAttribute('data-field', field);
        
        // Add "All" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All';
        filterSelect.appendChild(allOption);
        
        // Add options for each unique value
        uniqueValues.sort().forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            filterSelect.appendChild(option);
        });
        
        // Add change event listener
        filterSelect.addEventListener('change', applyFilters);
        
        // Add to filter controls
        filterCol.appendChild(filterLabel);
        filterCol.appendChild(filterSelect);
        filterControls.appendChild(filterCol);
    });
}

function applyFilters() {
    // Get all filter controls
    const filterControls = document.querySelectorAll('.filter-control');
    
    // Build filter criteria
    const filters = {};
    filterControls.forEach(control => {
        const field = control.getAttribute('data-field');
        const value = control.value;
        
        if (value !== 'all') {
            filters[field] = value;
        }
    });
    
    // Apply filters to results
    const filteredResults = surveyResults.filter(result => {
        return Object.entries(filters).every(([field, value]) => {
            return result[field] === value;
        });
    });
    
    // Update charts with filtered data
    updateCharts(filteredResults);
    
    // Update table with filtered data
    populateResultsTable(filteredResults);
}

function updateCharts(filteredResults) {
    if (!filteredResults || filteredResults.length === 0) {
        showError("No results match the selected filters");
        return;
    }
    
    // Get question keys (excluding reasoning fields)
    const questionKeys = Object.keys(filteredResults[0])
        .filter(key => key.startsWith('question_') && !key.includes('_reasoning'));
    
    // Update each chart with new data
    questionKeys.forEach((questionKey, index) => {
        // Count responses for each option
        const responses = {};
        filteredResults.forEach(result => {
            const answer = result[questionKey];
            responses[answer] = (responses[answer] || 0) + 1;
        });
        
        // Make sure options exist for this question
        if (!surveyOptions[index] || surveyOptions[index].length === 0) {
            console.warn(`No options found for question ${index + 1}`);
            return;
        }
        
        // Get options for this question
        const options = surveyOptions[index];
        
        // Update chart data
        const chartData = options.map(option => responses[option] || 0);
        
        // Update the chart
        const chart = charts[index];
        if (chart) {
            chart.data.datasets[0].data = chartData;
            chart.update();
        }
    });
}

function resetFilters() {
    // Reset all filter controls to "All"
    const filterControls = document.querySelectorAll('.filter-control');
    filterControls.forEach(control => {
        control.value = 'all';
    });
    
    // Apply filters (which will now be empty)
    applyFilters();
}

function populateResultsTable(data = null) {
    const tableData = data || surveyResults;
    if (tableData.length === 0) return;
    
    const tableHeader = document.getElementById('resultsTableHeader');
    const tableBody = document.getElementById('resultsTableBody');
    
    // Clear existing content
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Get all fields
    const fields = Object.keys(tableData[0]);
    
    // Add header row
    fields.forEach(field => {
        const th = document.createElement('th');
        th.textContent = field;
        tableHeader.appendChild(th);
    });
    
    // Add data rows
    tableData.forEach(result => {
        const tr = document.createElement('tr');
        
        fields.forEach(field => {
            const td = document.createElement('td');
            
            // Truncate reasoning fields in the UI display
            if (field.includes('_reasoning')) {
                const fullText = result[field] || '';
                // Only truncate if the text is longer than 50 characters
                if (fullText.length > 50) {
                    const truncatedText = fullText.substring(0, 50) + '...';
                    td.textContent = truncatedText;
                    
                    // Store the full text as a data attribute for CSV export
                    td.setAttribute('data-full-text', fullText);
                    
                    // Optional: Add a tooltip to show the full text on hover
                    td.title = fullText;
                } else {
                    td.textContent = fullText;
                }
            } else {
                td.textContent = result[field];
            }
            
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
}

// Utility functions
function showError(message) {
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    document.getElementById('errorModalBody').textContent = message;
    errorModal.show();
}