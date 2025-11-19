import React from 'react'

interface ScoreBadgeProps {
  score: number
}

const ScoreBadge = ({ score }: ScoreBadgeProps) => {
  let badgeClasses = ''
  let badageText = ''

  if (score > 70) {
    badgeClasses = 'bg-badge-green text-green-600'
    badageText = 'Strong'
  } else if (score > 49) {
    badgeClasses = 'bg-badge-yellow text-yellow-600'
    badageText = 'Good Start'
  } else {
    badgeClasses = 'bg-badge-red text-red-600'
    badageText = 'Needs Work'
  } 
  

  return (
    <div className={`px-3 py-1 rounded-full ${badgeClasses}`}>
      <p className='text-sm font-medium'>{badageText}</p>
    </div>
  )
}

export default ScoreBadge
