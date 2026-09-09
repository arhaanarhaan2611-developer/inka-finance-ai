import { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import './App.css'

type Transaction = {
  id: number
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  date: string
}

type Goal = {
  id: number
  name: string
  target: number
  current: number
  targetDate: string
  priority: 'High' | 'Medium' | 'Low'
}

type Business = {
  name: string
  industry: string
  revenue: number
  expenses: number
  assets: number
  liabilities: number
  employees: number
  monthlySales: number
  operatingCosts: number
}

const money = (value: number) => `$${value.toFixed(2)}`

function App() {
  const [started, setStarted] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('inka_transactions')
    if (!saved) return []
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  })

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('inka_goals')
    if (!saved) return []
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  })

  const [business, setBusiness] = useState<Business>(() => {
    const saved = localStorage.getItem('inka_business')
    if (!saved) {
      return {
        name: 'My Business',
        industry: 'General',
        revenue: 0,
        expenses: 0,
        assets: 0,
        liabilities: 0,
        employees: 0,
        monthlySales: 0,
        operatingCosts: 0,
      }
    }
    try {
      return JSON.parse(saved)
    } catch {
      return {
        name: 'My Business',
        industry: 'General',
        revenue: 0,
        expenses: 0,
        assets: 0,
        liabilities: 0,
        employees: 0,
        monthlySales: 0,
        operatingCosts: 0,
      }
    }
  })

  const [type, setType] = useState<'income' | 'expense'>('income')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')

  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalCurrent, setGoalCurrent] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [goalPriority, setGoalPriority] =
    useState<'High' | 'Medium' | 'Low'>('Medium')

  useEffect(() => {
    localStorage.setItem('inka_transactions', JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem('inka_goals', JSON.stringify(goals))
  }, [goals])

  useEffect(() => {
    localStorage.setItem('inka_business', JSON.stringify(business))
  }, [business])

  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )

  const totalExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )

  const balance = totalIncome - totalExpenses
  const netCashFlow = balance
  const savingsRate =
    totalIncome > 0 ? (balance / totalIncome) * 100 : 0

  const averageMonthlyIncome = useMemo(() => {
    if (!transactions.length) return 0
    const months = new Set(
      transactions.map((t) => t.date.slice(0, 7))
    ).size
    return totalIncome / Math.max(months, 1)
  }, [transactions, totalIncome])

  const averageMonthlyExpenses = useMemo(() => {
    if (!transactions.length) return 0
    const months = new Set(
      transactions.map((t) => t.date.slice(0, 7))
    ).size
    return totalExpenses / Math.max(months, 1)
  }, [transactions, totalExpenses])

  const biggestExpenseCategory = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + t.amount
      })

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
    return sorted.length ? sorted[0][0] : 'None yet'
  }, [transactions])

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + t.amount
      })

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const incomeCategoryData = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + t.amount
      })

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const chartData = useMemo(() => {
    const grouped: Record<
      string,
      { date: string; income: number; expenses: number; balance: number }
    > = {}

    transactions.forEach((t) => {
      if (!grouped[t.date]) {
        grouped[t.date] = {
          date: t.date,
          income: 0,
          expenses: 0,
          balance: 0,
        }
      }

      if (t.type === 'income') grouped[t.date].income += t.amount
      else grouped[t.date].expenses += t.amount
    })

    let runningBalance = 0
    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => {
        runningBalance += day.income - day.expenses
        return { ...day, balance: runningBalance }
      })
  }, [transactions])

  const forecast = useMemo(() => {
    const income = averageMonthlyIncome
    const expenses = averageMonthlyExpenses
    return {
      income,
      expenses,
      cashFlow: income - expenses,
      balanceNextMonth: balance + income - expenses,
      savings: Math.max(income - expenses, 0),
    }
  }, [averageMonthlyIncome, averageMonthlyExpenses, balance])

  const businessProfit = business.revenue - business.expenses
  const businessMargin =
    business.revenue > 0
      ? (businessProfit / business.revenue) * 100
      : 0
  const breakEven =
    business.monthlySales > 0 && business.operatingCosts > 0
      ? business.operatingCosts
      : 0

  const risks = useMemo(() => {
    const result: { level: string; title: string; detail: string }[] = []

    if (totalIncome > 0 && totalExpenses > totalIncome) {
      result.push({
        level: 'CRITICAL',
        title: 'Negative cash flow',
        detail: `Expenses exceed income by ${money(totalExpenses - totalIncome)}.`,
      })
    }

    if (totalIncome > 0 && savingsRate < 10) {
      result.push({
        level: 'HIGH',
        title: 'Low savings rate',
        detail: `Current savings rate is ${savingsRate.toFixed(1)}%.`,
      })
    }

    if (biggestExpenseCategory !== 'None yet') {
      const largest = categoryData[0]?.value || 0
      if (totalExpenses > 0 && largest / totalExpenses > 0.5) {
        result.push({
          level: 'MEDIUM',
          title: 'Expense concentration',
          detail: `${biggestExpenseCategory} represents more than half of tracked expenses.`,
        })
      }
    }

    if (business.liabilities > business.assets && business.assets > 0) {
      result.push({
        level: 'HIGH',
        title: 'Liabilities exceed assets',
        detail: 'Business liabilities are currently higher than tracked assets.',
      })
    }

    return result
  }, [
    totalIncome,
    totalExpenses,
    savingsRate,
    biggestExpenseCategory,
    categoryData,
    business.liabilities,
    business.assets,
  ])

  const opportunities = useMemo(() => {
    const result: { title: string; evidence: string; action: string }[] = []

    if (savingsRate >= 20) {
      result.push({
        title: 'Strong savings opportunity',
        evidence: `Your tracked savings rate is ${savingsRate.toFixed(1)}%.`,
        action: 'Consider assigning part of your surplus to a specific goal.',
      })
    }

    if (incomeCategoryData.length > 0) {
      result.push({
        title: 'Identify your strongest income source',
        evidence: `${incomeCategoryData[0].name} is your largest tracked income category.`,
        action: 'Explore ways to strengthen or diversify this source.',
      })
    }

    if (categoryData.length > 0 && categoryData[0].value > 0) {
      result.push({
        title: 'Review your largest expense',
        evidence: `${categoryData[0].name} is your largest tracked expense category.`,
        action: 'Check whether part of this spending can be reduced or optimized.',
      })
    }

    return result
  }, [savingsRate, incomeCategoryData, categoryData])

  const swot = useMemo(() => {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const opportunitiesList: string[] = []
    const threats: string[] = []

    if (savingsRate >= 20) strengths.push('Healthy tracked savings rate.')
    if (balance > 0) strengths.push('Positive tracked cash position.')
    if (transactions.length >= 5)
      strengths.push('Enough transaction history for better analysis.')

    if (balance < 0) weaknesses.push('Tracked expenses currently exceed income.')
    if (savingsRate < 10 && totalIncome > 0)
      weaknesses.push('Savings rate is currently low.')
    if (businessMargin < 10 && business.revenue > 0)
      weaknesses.push('Business profit margin is currently low.')

    if (incomeCategoryData.length > 0)
      opportunitiesList.push(
        `Strengthen ${incomeCategoryData[0].name} or diversify income sources.`
      )
    if (categoryData.length > 0)
      opportunitiesList.push(
        `Optimize spending in ${categoryData[0].name}.`
      )

    if (risks.length > 0)
      threats.push(...risks.map((r) => r.title))
    if (business.liabilities > 0)
      threats.push('Debt/liability exposure should be monitored.')

    return {
      strengths: strengths.length ? strengths : ['Add financial data to identify strengths.'],
      weaknesses: weaknesses.length ? weaknesses : ['No major weakness detected from current data.'],
      opportunities: opportunitiesList.length
        ? opportunitiesList
        : ['More data is needed to identify strong opportunities.'],
      threats: threats.length ? threats : ['No supported major threat detected.'],
    }
  }, [
    savingsRate,
    balance,
    transactions.length,
    businessMargin,
    business.revenue,
    incomeCategoryData,
    categoryData,
    risks,
    business.liabilities,
    totalIncome,
  ])

  function addTransaction() {
    const value = Number(amount)

    if (!value || value <= 0 || !description.trim()) {
      alert('Enter a valid amount and description.')
      return
    }

    const transaction: Transaction = {
      id: Date.now(),
      type,
      amount: value,
      description: description.trim(),
      category,
      date: new Date().toISOString().split('T')[0],
    }

    setTransactions((current) => [transaction, ...current])
    setAmount('')
    setDescription('')
  }

  function deleteTransaction(id: number) {
    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== id)
    )
  }

  function addGoal() {
    const target = Number(goalTarget)
    const current = Number(goalCurrent || 0)

    if (!goalName.trim() || !target || target <= 0 || !goalDate) {
      alert('Enter a goal name, target amount and target date.')
      return
    }

    setGoals((currentGoals) => [
      {
        id: Date.now(),
        name: goalName.trim(),
        target,
        current: Math.max(current, 0),
        targetDate: goalDate,
        priority: goalPriority,
      },
      ...currentGoals,
    ])

    setGoalName('')
    setGoalTarget('')
    setGoalCurrent('')
    setGoalDate('')
  }

  function deleteGoal(id: number) {
    setGoals((current) => current.filter((goal) => goal.id !== id))
  }

  async function askINKA() {
    if (!aiQuestion.trim()) return

    setAiLoading(true)
    setAiAnswer('')

    try {
      const response = await fetch('http://localhost:3001/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `
Analyze this INKA financial data.

Total income: ${money(totalIncome)}
Total expenses: ${money(totalExpenses)}
Current balance: ${money(balance)}
Net cash flow: ${money(netCashFlow)}
Savings rate: ${savingsRate.toFixed(1)}%
Biggest expense category: ${biggestExpenseCategory}
Average monthly income: ${money(averageMonthlyIncome)}
Average monthly expenses: ${money(averageMonthlyExpenses)}

Forecast:
Next month income estimate: ${money(forecast.income)}
Next month expenses estimate: ${money(forecast.expenses)}
Next month cash flow estimate: ${money(forecast.cashFlow)}

User question:
${aiQuestion}

Answer clearly and briefly. Use only the supplied data. If the data is insufficient, say so.
          `,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'AI request failed')
      }

      setAiAnswer(data.answer)
    } catch (error) {
      console.error(error)
      setAiAnswer(
        'INKA could not connect to the AI backend. Make sure node server.js is still running.'
      )
    } finally {
      setAiLoading(false)
    }
  }

  if (!started) {
    return (
      <div className="app">
        <div className="card">
          <p className="small-title">AI-POWERED FINANCIAL INTELLIGENCE</p>
          <h1>INKA</h1>
          <p className="subtitle">The Future of Smart Finance</p>
          <p className="intro">
            Understand your money. Predict your future.
            <br />
            Make smarter financial decisions.
          </p>
          <button onClick={() => setStarted(true)}>GET STARTED</button>
        </div>
      </div>
    )
  }

  const navItems = [
    ['overview', 'OVERVIEW'],
    ['analytics', 'ANALYTICS'],
    ['ai', 'AI ANALYST'],
    ['forecast', 'FORECAST'],
    ['goals', 'GOALS'],
    ['business', 'BUSINESS'],
    ['strategy', 'SWOT + STRATEGY'],
    ['risk', 'RISK + OPPORTUNITY'],
    ['transactions', 'TRANSACTIONS'],
  ]

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="logo">INKA</div>
        <div className="status">● AI ONLINE</div>
      </header>

      <main className="dashboard-content">
        <nav
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 28,
          }}
        >
          {navItems.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              style={{
                padding: '9px 13px',
                border: activeSection === id
                  ? '1px solid #b6ff00'
                  : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                background:
                  activeSection === id
                    ? 'rgba(182,255,0,0.08)'
                    : 'rgba(255,255,255,0.03)',
                color: activeSection === id ? '#b6ff00' : '#aaa',
                cursor: 'pointer',
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <p className="welcome">FINANCIAL INTELLIGENCE</p>
        <h1>Your Financial Command Center</h1>
        <p className="description">
          Track your money. Understand your finances. Make smarter decisions.
        </p>

        {(activeSection === 'overview' || activeSection === 'analytics') && (
          <>
            <div className="stats">
              <div className="stat-card">
                <span>Total Balance</span>
                <strong>{money(balance)}</strong>
              </div>
              <div className="stat-card">
                <span>Total Income</span>
                <strong>{money(totalIncome)}</strong>
              </div>
              <div className="stat-card">
                <span>Total Expenses</span>
                <strong>{money(totalExpenses)}</strong>
              </div>
              <div className="stat-card">
                <span>Savings Rate</span>
                <strong>{savingsRate.toFixed(1)}%</strong>
              </div>
            </div>

            <section className="ai-card">
              <div>
                <span className="ai-label">AI FINANCIAL ANALYST</span>
                <h2>
                  {transactions.length === 0
                    ? 'Your AI is ready.'
                    : 'Financial data detected.'}
                </h2>
                <p>
                  {transactions.length === 0
                    ? 'Add your first transaction and INKA will start understanding your finances.'
                    : `INKA has analyzed ${transactions.length} transaction${
                        transactions.length === 1 ? '' : 's'
                      }. Your balance is ${money(balance)}, savings rate is ${savingsRate.toFixed(
                        1
                      )}%, and largest expense category is ${biggestExpenseCategory}.`}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginTop: 18,
                    flexWrap: 'wrap',
                  }}
                >
                  <input
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') askINKA()
                    }}
                    placeholder="Ask INKA about your finances..."
                    style={{
                      flex: 1,
                      minWidth: 220,
                      padding: 13,
                      borderRadius: 10,
                      border: '1px solid rgba(182,255,0,0.25)',
                      background: '#080a0d',
                      color: '#fff',
                    }}
                  />
                  <button onClick={askINKA} disabled={aiLoading}>
                    {aiLoading ? 'ANALYZING...' : 'ASK INKA'}
                  </button>
                </div>

                {aiAnswer && (
                  <div
                    style={{
                      marginTop: 15,
                      padding: 15,
                      borderRadius: 12,
                      background: 'rgba(199,125,255,0.08)',
                      border: '1px solid rgba(199,125,255,0.25)',
                    }}
                  >
                    <strong>INKA AI</strong>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{aiAnswer}</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeSection === 'analytics' && (
          <>
            <section className="transaction-panel">
              <span className="ai-label">CASH FLOW</span>
              <h2>Income vs Expenses</h2>
              {chartData.length === 0 ? (
                <p className="empty-state">Add transactions to generate analytics.</p>
              ) : (
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="date" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip
                        formatter={(value) => money(Number(value))}
                        contentStyle={{
                          background: '#0b0d10',
                          border: '1px solid rgba(182,255,0,0.3)',
                          borderRadius: 10,
                        }}
                      />
                      <Line type="monotone" dataKey="income" stroke="#b6ff00" strokeWidth={3} name="Income" />
                      <Line type="monotone" dataKey="expenses" stroke="#c77dff" strokeWidth={3} name="Expenses" />
                      <Line type="monotone" dataKey="balance" stroke="#ffffff" strokeWidth={2} name="Balance" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
                gap: 20,
              }}
            >
              <section className="transaction-panel">
                <span className="ai-label">EXPENSE INTELLIGENCE</span>
                <h2>Expenses by Category</h2>
                {categoryData.length ? (
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip formatter={(value) => money(Number(value))} />
                        <Bar dataKey="value" fill="#c77dff" name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="empty-state">No expense data yet.</p>
                )}
              </section>

              <section className="transaction-panel">
                <span className="ai-label">INCOME INTELLIGENCE</span>
                <h2>Income Sources</h2>
                {incomeCategoryData.length ? (
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={incomeCategoryData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          label
                        >
                          {incomeCategoryData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={index % 2 === 0 ? '#b6ff00' : '#c77dff'}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => money(Number(value))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="empty-state">No income data yet.</p>
                )}
              </section>
            </div>
          </>
        )}

        {activeSection === 'ai' && (
          <section className="ai-card">
            <span className="ai-label">DEEPSEEK FINANCIAL ANALYST</span>
            <h2>Ask INKA anything about your tracked finances</h2>
            <p>
              Examples: Where am I spending the most? How can I save more?
              What should I focus on next month?
            </p>
            <input
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Ask your financial question..."
              style={{
                width: '100%',
                padding: 14,
                marginTop: 12,
                borderRadius: 10,
                border: '1px solid rgba(182,255,0,0.25)',
                background: '#080a0d',
                color: '#fff',
              }}
            />
            <button onClick={askINKA} disabled={aiLoading} style={{ marginTop: 12 }}>
              {aiLoading ? 'ANALYZING...' : 'ASK INKA'}
            </button>
            {aiAnswer && (
              <div
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 12,
                  background: 'rgba(199,125,255,0.08)',
                }}
              >
                <strong>INKA AI RESPONSE</strong>
                <p style={{ whiteSpace: 'pre-wrap' }}>{aiAnswer}</p>
              </div>
            )}
          </section>
        )}

        {activeSection === 'forecast' && (
          <section className="transaction-panel">
            <span className="ai-label">FORECAST ENGINE</span>
            <h2>Next-Month Estimate</h2>
            <p className="description">
              Estimate based on your tracked historical monthly averages. This is not a guarantee.
            </p>
            <div className="stats">
              <div className="stat-card">
                <span>Estimated Income</span>
                <strong>{money(forecast.income)}</strong>
              </div>
              <div className="stat-card">
                <span>Estimated Expenses</span>
                <strong>{money(forecast.expenses)}</strong>
              </div>
              <div className="stat-card">
                <span>Estimated Cash Flow</span>
                <strong>{money(forecast.cashFlow)}</strong>
              </div>
              <div className="stat-card">
                <span>Projected Balance</span>
                <strong>{money(forecast.balanceNextMonth)}</strong>
              </div>
            </div>
            <p>
              INKA uses your tracked transaction history and monthly averages.
              Add more history to make the estimate more useful.
            </p>
          </section>
        )}

        {activeSection === 'goals' && (
          <>
            <section className="transaction-panel">
              <span className="ai-label">FINANCIAL GOALS</span>
              <h2>Create Goal</h2>
              <div className="transaction-form">
                <input
                  placeholder="Goal name"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Target amount ($)"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Current amount ($)"
                  value={goalCurrent}
                  onChange={(e) => setGoalCurrent(e.target.value)}
                />
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                />
                <select
                  value={goalPriority}
                  onChange={(e) =>
                    setGoalPriority(e.target.value as 'High' | 'Medium' | 'Low')
                  }
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <button onClick={addGoal}>CREATE GOAL</button>
              </div>
            </section>

            <section className="transaction-panel">
              <span className="ai-label">GOAL TRACKING</span>
              <h2>Your Goals</h2>
              {goals.length === 0 ? (
                <p className="empty-state">No goals yet.</p>
              ) : (
                <div className="transaction-list">
                  {goals.map((goal) => {
                    const progress = Math.min(
                      100,
                      goal.target > 0 ? (goal.current / goal.target) * 100 : 0
                    )
                    return (
                      <div className="transaction-row" key={goal.id}>
                        <div style={{ flex: 1 }}>
                          <strong>{goal.name}</strong>
                          <span>
                            {money(goal.current)} / {money(goal.target)} • Due {goal.targetDate} • {goal.priority}
                          </span>
                          <div
                            style={{
                              height: 8,
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: 20,
                              marginTop: 10,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: '#b6ff00',
                              }}
                            />
                          </div>
                        </div>
                        <div className="transaction-right">
                          <strong>{progress.toFixed(0)}%</strong>
                          <button
                            className="delete-button"
                            onClick={() => deleteGoal(goal.id)}
                          >
                            DELETE
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeSection === 'business' && (
          <section className="transaction-panel">
            <span className="ai-label">BUSINESS INTELLIGENCE</span>
            <h2>Business Profile</h2>

            <div className="transaction-form">
              <input
                placeholder="Business name"
                value={business.name}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
              />
              <input
                placeholder="Industry"
                value={business.industry}
                onChange={(e) => setBusiness({ ...business, industry: e.target.value })}
              />
              <input
                type="number"
                placeholder="Revenue ($)"
                value={business.revenue || ''}
                onChange={(e) => setBusiness({ ...business, revenue: Number(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Expenses ($)"
                value={business.expenses || ''}
                onChange={(e) => setBusiness({ ...business, expenses: Number(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Assets ($)"
                value={business.assets || ''}
                onChange={(e) => setBusiness({ ...business, assets: Number(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Liabilities ($)"
                value={business.liabilities || ''}
                onChange={(e) => setBusiness({ ...business, liabilities: Number(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Employees"
                value={business.employees || ''}
                onChange={(e) => setBusiness({ ...business, employees: Number(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Monthly sales ($)"
                value={business.monthlySales || ''}
                onChange={(e) => setBusiness({ ...business, monthlySales: Number(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Operating costs ($)"
                value={business.operatingCosts || ''}
                onChange={(e) => setBusiness({ ...business, operatingCosts: Number(e.target.value) })}
              />
            </div>

            <div className="stats" style={{ marginTop: 20 }}>
              <div className="stat-card">
                <span>Profit</span>
                <strong>{money(businessProfit)}</strong>
              </div>
              <div className="stat-card">
                <span>Profit Margin</span>
                <strong>{businessMargin.toFixed(1)}%</strong>
              </div>
              <div className="stat-card">
                <span>Net Assets</span>
                <strong>{money(business.assets - business.liabilities)}</strong>
              </div>
              <div className="stat-card">
                <span>Break-Even Cost</span>
                <strong>{money(breakEven)}</strong>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'strategy' && (
          <>
            <section className="transaction-panel">
              <span className="ai-label">SWOT ANALYSIS</span>
              <h2>Data-Based SWOT</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                  gap: 15,
                }}
              >
                {[
                  ['STRENGTHS', swot.strengths],
                  ['WEAKNESSES', swot.weaknesses],
                  ['OPPORTUNITIES', swot.opportunities],
                  ['THREATS', swot.threats],
                ].map(([title, items]) => (
                  <div
                    key={title as string}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <strong>{title}</strong>
                    <ul>
                      {(items as string[]).map((item) => (
                        <li key={item} style={{ marginTop: 8 }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="ai-card">
              <span className="ai-label">STRATEGY ENGINE</span>
              <h2>Recommended Actions</h2>
              <p>
                1. Review your largest expense category and look for measurable reductions.
              </p>
              <p>
                2. Strengthen your strongest income source while developing diversification.
              </p>
              <p>
                3. If cash flow is positive, assign a specific portion to your highest-priority goal.
              </p>
              <p>
                4. For a business, monitor profit margin and operating costs before expansion.
              </p>
            </section>
          </>
        )}

        {activeSection === 'risk' && (
          <>
            <section className="transaction-panel">
              <span className="ai-label">RISK DETECTION</span>
              <h2>Financial Risks</h2>
              {risks.length === 0 ? (
                <p className="empty-state">
                  No major supported risk detected from your current data.
                </p>
              ) : (
                <div className="transaction-list">
                  {risks.map((risk) => (
                    <div className="transaction-row" key={risk.title}>
                      <div>
                        <strong>{risk.level} — {risk.title}</strong>
                        <span>{risk.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="transaction-panel">
              <span className="ai-label">OPPORTUNITY DETECTION</span>
              <h2>Financial Opportunities</h2>
              {opportunities.length === 0 ? (
                <p className="empty-state">
                  Add more financial data to identify opportunities.
                </p>
              ) : (
                <div className="transaction-list">
                  {opportunities.map((opportunity) => (
                    <div className="transaction-row" key={opportunity.title}>
                      <div>
                        <strong>{opportunity.title}</strong>
                        <span>Evidence: {opportunity.evidence}</span>
                        <span>Next action: {opportunity.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeSection === 'transactions' && (
          <>
            <section className="transaction-panel">
              <span className="ai-label">TRANSACTION ENGINE</span>
              <h2>Add Transaction</h2>

              <div className="transaction-form">
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as 'income' | 'expense')
                  }
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount ($)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />

                <input
                  type="text"
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>General</option>
                  <option>Food</option>
                  <option>Transport</option>
                  <option>Shopping</option>
                  <option>Education</option>
                  <option>Business</option>
                  <option>Salary</option>
                  <option>Entertainment</option>
                  <option>Health</option>
                  <option>Other</option>
                </select>

                <button onClick={addTransaction}>ADD TRANSACTION</button>
              </div>
            </section>

            <section className="transaction-panel">
              <span className="ai-label">TRANSACTION HISTORY</span>
              <h2>Your Transactions</h2>

              {transactions.length === 0 ? (
                <p className="empty-state">
                  No transactions yet. Add your first income or expense above.
                </p>
              ) : (
                <div className="transaction-list">
                  {transactions.map((transaction) => (
                    <div className="transaction-row" key={transaction.id}>
                      <div>
                        <strong>{transaction.description}</strong>
                        <span>
                          {transaction.category} • {transaction.date}
                        </span>
                      </div>

                      <div className="transaction-right">
                        <strong>
                          {transaction.type === 'income' ? '+' : '-'}
                          {money(transaction.amount)}
                        </strong>

                        <button
                          className="delete-button"
                          onClick={() => deleteTransaction(transaction.id)}
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <footer
          style={{
            marginTop: 40,
            padding: 20,
            textAlign: 'center',
            opacity: 0.6,
            fontSize: 12,
          }}
        >
          INKA • AI-POWERED FINANCIAL INTELLIGENCE • USD
        </footer>
      </main>
    </div>
  )
}

export default App
