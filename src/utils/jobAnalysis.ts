import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from '../analysis/HACKRU/config'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export const analyzeJobDescription = async (jobDescription: string) => {
    try {
        const analysisPrompt = `Analyze this job description and extract key information:\n\n${jobDescription}\n\nPlease provide:\n1. Job Title/Role\n2. Company (if mentioned)\n3. Key Skills Required\n4. Experience Level\n5. Interview Focus Areas\n\nFormat your response as JSON with these fields: {"role": "Job Title", "company": "Company Name", "skills": ["skill1", "skill2"], "experience": "level", "focusAreas": ["area1", "area2"]}`

        const model = genAI.getGenerativeModel({ model: config.geminiModel });
        const result = await model.generateContent(analysisPrompt);
        const response = result.response;
        const analysisText = response.text();

        // Try to parse JSON from the response
        let roleInfo = null
        try {
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                roleInfo = JSON.parse(jsonMatch[0])
            }
        } catch (e) {
            console.error('Failed to parse role info JSON:', e)
        }

        return {
            analysisText,
            roleInfo
        }
    } catch (error) {
        console.error('Error analyzing job description:', error)
        return {
            analysisText: 'Error analyzing job description',
            roleInfo: null
        }
    }
}
