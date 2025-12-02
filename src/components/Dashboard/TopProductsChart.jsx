import { Bar } from 'react-chartjs-2';

/**
 * Composant graphique pour les top produits
 */

const TopProductsChart = ({ data }) => {
  const chartData = {
    labels: data?.map(p => p.name || 'N/A') || [],
    datasets: [
      {
        label: 'Quantité vendue',
        data: data?.map(p => p.total_quantity || 0) || [],
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} unités`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default TopProductsChart;

