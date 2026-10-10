import numpy as np
from typing import List, Dict, Any

def calculate_backtest_metrics(initial_capital: float,
                               trades: List[Dict[str, Any]],
                               equity_curve: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes quantitative backtesting performance metrics.
    """
    if not equity_curve:
        return {
            "total_return_pct": 0.0,
            "win_rate_pct": 0.0,
            "profit_factor": 0.0,
            "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0,
            "max_drawdown_pct": 0.0,
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0
        }

    final_equity = equity_curve[-1]["equity"]
    total_return_pct = ((final_equity - initial_capital) / initial_capital) * 100.0

    total_trades = len(trades)
    winning_trades = sum(1 for t in trades if t["pnl"] > 0)
    losing_trades = sum(1 for t in trades if t["pnl"] < 0)
    
    win_rate_pct = (winning_trades / total_trades * 100.0) if total_trades > 0 else 0.0

    gross_profit = sum(t["pnl"] for t in trades if t["pnl"] > 0)
    gross_loss = abs(sum(t["pnl"] for t in trades if t["pnl"] < 0))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (gross_profit if gross_profit > 0 else 1.0)

    # Daily / Step return stats for Sharpe and Sortino
    equities = [p["equity"] for p in equity_curve]
    returns = np.diff(equities) / equities[:-1] if len(equities) > 1 else np.array([0.0])

    mean_ret = np.mean(returns) if len(returns) > 0 else 0.0
    std_ret = np.std(returns) if len(returns) > 1 else 1e-6

    # Annualized Sharpe (assuming 100ms ticks = 315,360,000 steps per year; or scaled factor 252*86400)
    sharpe_ratio = float((mean_ret / (std_ret + 1e-9)) * np.sqrt(252 * 1440))

    downside_returns = returns[returns < 0]
    downside_std = np.std(downside_returns) if len(downside_returns) > 1 else 1e-6
    sortino_ratio = float((mean_ret / (downside_std + 1e-9)) * np.sqrt(252 * 1440))

    # Max Drawdown
    peak = equities[0]
    max_dd = 0.0
    for eq in equities:
        if eq > peak:
            peak = eq
        dd = (peak - eq) / peak * 100.0
        if dd > max_dd:
            max_dd = dd

    return {
        "total_return_pct": round(total_return_pct, 2),
        "win_rate_pct": round(win_rate_pct, 2),
        "profit_factor": round(profit_factor, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "sortino_ratio": round(sortino_ratio, 2),
        "max_drawdown_pct": round(max_dd, 2),
        "total_trades": total_trades,
        "winning_trades": winning_trades,
        "losing_trades": losing_trades
    }
