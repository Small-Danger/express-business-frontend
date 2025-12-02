import { Bar } from 'react-chartjs-2';

/**
 * Composant graphique pour les top clients
 */

const TopClientsChart = ({ data }) => {
  const chartData = {
    labels: data?.map(c => c.full_name || `${c.first_name} ${c.last_name}`) || [],
    datasets: [
      {
        label: 'CA par client',
        data: data?.map(c => c.total_revenue || 0) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (context.parsed.x !== null) {
              return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(context.parsed.x);
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'XOF',
              notation: 'compact',
            }).format(value);
          },
        },
      },
      y: {
        display: true,
        grid: {
          display: false,
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

export default TopClientsChart;

