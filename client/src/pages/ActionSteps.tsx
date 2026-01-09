import { CheckSquare } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import './PageStyles.css'

const ActionSteps = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>10X Action Step Framework</h1>
        <p className="page-subtitle">Structure and track action steps from coaching sessions</p>
      </div>

      <div className="content-card framework-content-card">
        <div className="framework-intro">
          <h2>Action Step Framework</h2>
          <p>The 10X Action Step Framework helps ensure accountability and follow-through on commitments made during coaching sessions.</p>
        </div>

        <div className="flywheel-model-container">
          {/* Left Side - Flywheel Circle using Recharts */}
          <div className="flywheel-left-section">
            <div className="flywheel-circle-wrapper">
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Define Clear Action', value: 20, color: '#dc2626' },
                      { name: 'Assign Ownership', value: 20, color: '#ec4899' },
                      { name: 'Set Deadline', value: 20, color: '#f97316' },
                      { name: 'Track Progress', value: 20, color: '#f59e0b' },
                      { name: 'Review & Follow-up', value: 20, color: '#10b981' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={220}
                    paddingAngle={0}
                    dataKey="value"
                    startAngle={0}
                  >
                    {[
                      { name: 'Define Clear Action', value: 20, color: '#dc2626' },
                      { name: 'Assign Ownership', value: 20, color: '#ec4899' },
                      { name: 'Set Deadline', value: 20, color: '#f97316' },
                      { name: 'Track Progress', value: 20, color: '#f59e0b' },
                      { name: 'Review & Follow-up', value: 20, color: '#10b981' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              {/* Central Circle */}
              <div className="flywheel-center-circle">
                <h3>10X Action Step Framework</h3>
                <p>Continuous Improvement Cycle</p>
              </div>
            </div>
          </div>

          {/* Right Side - Text Boxes */}
          <div className="flywheel-text-boxes">
            <div className="flywheel-text-box box-1">
              <div className="text-box-header" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
                <h4>1. Define Clear Action</h4>
              </div>
              <div className="text-box-body">
                <p>Each action step must be specific, measurable, and time-bound to ensure clarity and accountability.</p>
              </div>
            </div>

            <div className="flywheel-text-box box-2">
              <div className="text-box-header" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}>
                <h4>2. Assign Ownership</h4>
              </div>
              <div className="text-box-body">
                <p>Every action step has a single owner responsible for completion and follow-through.</p>
              </div>
            </div>

            <div className="flywheel-text-box box-3">
              <div className="text-box-header" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
                <h4>3. Set Deadline</h4>
              </div>
              <div className="text-box-body">
                <p>Establish a clear due date for each action step to maintain momentum and urgency.</p>
              </div>
            </div>

            <div className="flywheel-text-box box-4">
              <div className="text-box-header" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                <h4>4. Track Progress</h4>
              </div>
              <div className="text-box-body">
                <p>Monitor completion status and update regularly to ensure visibility and accountability.</p>
              </div>
            </div>

            <div className="flywheel-text-box box-5">
              <div className="text-box-header" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                <h4>5. Review & Follow-up</h4>
              </div>
              <div className="text-box-body">
                <p>Review completed actions and follow up on pending items to maintain continuous improvement.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="action-steps-list">
          <h2>Recent Action Steps</h2>
          <div className="steps-table">
            <div className="step-item">
              <CheckSquare size={20} />
              <div className="step-details">
                <h4>Complete Q1 planning document</h4>
                <p>Owner: Alice Cooper | Due: Jan 25, 2024</p>
              </div>
              <span className="step-status pending">Pending</span>
            </div>
            <div className="step-item">
              <CheckSquare size={20} />
              <div className="step-details">
                <h4>Review marketing strategy</h4>
                <p>Owner: Bob Miller | Due: Jan 24, 2024</p>
              </div>
              <span className="step-status in-progress">In Progress</span>
            </div>
            <div className="step-item">
              <CheckSquare size={20} />
              <div className="step-details">
                <h4>Schedule team meeting</h4>
                <p>Owner: Charlie Brown | Due: Jan 23, 2024</p>
              </div>
              <span className="step-status completed">Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActionSteps

