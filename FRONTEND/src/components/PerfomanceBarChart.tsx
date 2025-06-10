import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceData {
  discipline_name: string;
  score: number;
  max_score: number;
  grade?: string; // Opcional
}

interface PerformanceBarChartProps {
  data: PerformanceData[];
}

const PerformanceBarChart = ({ data }: PerformanceBarChartProps) => {
  const chartData = data.map(item => ({
    name: item.discipline_name,
    Pontuação: item.score,
    'Pont. Máxima': item.max_score,
    percentual: parseFloat(((item.score / item.max_score) * 100).toFixed(2))
  }));

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg h-96">
      <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Desempenho por Disciplina (%)</h3>
      {chartData.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 h-full flex items-center justify-center">
          Ainda não há dados de desempenho para exibir.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis 
              dataKey="name" 
              angle={-30} 
              textAnchor="end" 
              height={70} 
              interval={0}
              tick={{ fontSize: 12, fill: '#64748b' }} 
            />
            <YAxis 
              label={{ value: 'Percentual (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
              tick={{ fontSize: 12, fill: '#64748b' }}
              domain={[0, 100]}
            />
            <Tooltip
              cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#0ea5e9',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}
              labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="percentual" name="Aproveitamento (%)" fill="url(#colorPercentual)" barSize={30} radius={[4, 4, 0, 0]} />
            <defs>
              <linearGradient id="colorPercentual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.7}/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default PerformanceBarChart;