import { Fragment } from 'react';
import { TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';

const KPICard = ({ title, value, trend, showMenu = true, onClick, clickable = false, change, changeType, kpiType }) => {
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;
  const trendClass = trend === 'down' ? 'text-rose-600' : 'text-emerald-600';

  const cardContentJSX = (
    <Fragment>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {showMenu && (
          // Use div instead of button when card is clickable to avoid nested buttons
          clickable ? (
            <div className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <MoreHorizontal className="w-4 h-4" />
            </div>
          ) : (
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {change && (
          <Badge variant={changeType === 'positive' ? 'default' : 'destructive'} className="text-xs">
            {change}
          </Badge>
        )}
      </div>
    </Fragment>
  );

  if (clickable && onClick) {
    return (
      <motion.button
        onClick={onClick}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        whileHover={{ scale: 1.01 }}
        className="text-left w-full"
      >
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 flex flex-col gap-2">
            {cardContentJSX}
          </CardContent>
        </Card>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6 flex flex-col gap-2">
          {cardContentJSX}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default KPICard;
