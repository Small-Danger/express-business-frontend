/**
 * Composant de carte KPI réutilisable
 */

const KPICard = ({ title, value, subtitle, icon, color = 'blue', trend, trendValue }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      value: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-100',
      icon: 'text-green-600',
      value: 'text-green-600',
    },
    purple: {
      bg: 'bg-purple-100',
      icon: 'text-purple-600',
      value: 'text-purple-600',
    },
    yellow: {
      bg: 'bg-yellow-100',
      icon: 'text-yellow-600',
      value: 'text-yellow-600',
    },
    red: {
      bg: 'bg-red-100',
      icon: 'text-red-600',
      value: 'text-red-600',
    },
    indigo: {
      bg: 'bg-indigo-100',
      icon: 'text-indigo-600',
      value: 'text-indigo-600',
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide">{title}</p>
          <p className={`text-xl sm:text-2xl font-extrabold mt-1 sm:mt-2 ${colors.value}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center mt-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`${colors.bg} dark:opacity-80 rounded-xl p-2 sm:p-3 ml-3 transform hover:scale-110 transition-transform duration-200`}>
            <div className="w-6 h-6 sm:w-7 sm:h-7">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;

