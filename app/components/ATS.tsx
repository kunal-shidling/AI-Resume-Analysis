import React from 'react'

interface Suggestion {
  type: "good" | "improve"
  tip: string
}

interface ATSProps {
  score: number
  suggestions: Suggestion[]
}

const ATS = ({ score, suggestions }: ATSProps) => {
  let gradientClasses = ''
  let iconSrc = ''

  if (score > 70) {
    gradientClasses = 'bg-gradient-to-r from-green-100 to-green-200'
    iconSrc = '/icons/ats-good.svg'
  } else if (score > 49) {
    gradientClasses = 'bg-gradient-to-r from-yellow-100 to-yellow-200'
    iconSrc = '/icons/ats-warning.svg'
  } else {
    gradientClasses = 'bg-gradient-to-r from-red-100 to-red-200'
    iconSrc = '/icons/ats-bad.svg'
  }

  return (
    <div className={`rounded-2xl shadow-md p-6 ${gradientClasses}`}>
      <div className="flex items-center mb-4">
        <img src={iconSrc} alt="ATS Icon" className="w-8 h-8 mr-3" />
        <h2 className="text-xl font-bold">ATS Score - {score}/100</h2>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Applicant Tracking System Compatibility</h3>
        <p className="text-gray-600">
          This score indicates how well your resume performs against ATS systems used by employers to filter candidates.
        </p>
      </div>

      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3">Suggestions:</h4>
        <ul className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start">
              <img
                src={suggestion.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
                alt={suggestion.type === "good" ? "Check" : "Warning"}
                className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm">{suggestion.tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-gray-700 italic">
        Keep improving your resume to increase your chances of passing ATS filters!
      </p>
    </div>
  )
}

export default ATS
