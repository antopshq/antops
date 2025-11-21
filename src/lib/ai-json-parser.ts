// Utility function to parse JSON from AI responses that might be wrapped in markdown code blocks

export function parseAIResponse(content: string): any {
  if (!content) {
    throw new Error('Empty content provided')
  }

  // First, try to parse as direct JSON
  try {
    return JSON.parse(content.trim())
  } catch (directParseError) {
    // If direct parsing fails, try to extract from markdown code blocks
    console.log('Direct JSON parsing failed, attempting to extract from markdown...')
  }

  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g
  const matches = content.match(codeBlockRegex)

  if (matches && matches.length > 0) {
    // Extract the content from the first code block
    const jsonContent = matches[0].replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '').trim()
    
    try {
      return JSON.parse(jsonContent)
    } catch (codeBlockParseError) {
      console.error('Failed to parse JSON from code block:', jsonContent)
      throw new Error('Invalid JSON in markdown code block')
    }
  }

  // If no code blocks found, try to find JSON-like content
  const jsonStart = content.indexOf('{')
  const jsonEnd = content.lastIndexOf('}')

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    const potentialJson = content.slice(jsonStart, jsonEnd + 1)
    try {
      return JSON.parse(potentialJson)
    } catch (extractParseError) {
      console.error('Failed to parse extracted JSON:', potentialJson)
      throw new Error('No valid JSON found in response')
    }
  }

  throw new Error('No parseable JSON found in AI response')
}