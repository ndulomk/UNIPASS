'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchEnrollmentChartData } from '@/lib/api';
import { EnrollmentChartData } from '@/types';

export default function EnrollmentsChartPage() {
    const [data, setData] = useState<EnrollmentChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchEnrollmentChartData()
            .then(chartData => setData(chartData))
            .catch(err => setError("Falha ao carregar dados do gráfico."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Carregando gráfico...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Relatório de Matrículas Mensais</h1>
            <p>Total de novas matrículas por mês no ano corrente.</p>
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-4 h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0f0f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        stroke="#718096"
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        stroke="#718096"
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(236, 253, 245, 0.4)' }}
                        contentStyle={{ 
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          borderColor: '#e2e8f0',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: '#1a202c' 
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          paddingTop: '20px'
                        }}
                      />
                      <Bar
                        dataKey="total"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                        name="Novas Matrículas"
                      />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}