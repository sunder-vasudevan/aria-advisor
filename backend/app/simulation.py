import random
import math
from datetime import date


def monte_carlo_goal_probability(
    current_value: float,
    monthly_sip: float,
    target_amount: float,
    target_date: date,
    annual_return_rate: float = 0.12,
    inflation_rate: float = 0.06,
    simulations: int = 1000,
) -> dict:
    """
    Run Monte Carlo simulation to estimate goal success probability.

    Inflates the target_amount to future value using inflation_rate so the
    probability reflects real purchasing power, not just nominal rupees.

    Models monthly portfolio growth with random return variation (±5% std dev
    around the assumed annual rate), compounding SIP contributions monthly.

    Returns dict with:
      - probability_pct: float 0–100
      - real_target: nominal future value after inflation
      - median_corpus: median final corpus across simulations (future ₹)
      - median_corpus_real: median corpus in today's ₹ (deflated)
    """
    today = date.today()
    months = (target_date.year - today.year) * 12 + (target_date.month - today.month)
    if months <= 0:
        return {
            "probability_pct": 0.0,
            "real_target": target_amount,
            "median_corpus": 0.0,
            "median_corpus_real": 0.0,
        }

    years = months / 12
    # Inflate target to future value
    real_target = target_amount * ((1 + inflation_rate) ** years)

    monthly_return = annual_return_rate / 12
    monthly_std_dev = 0.05 / math.sqrt(12)  # annualised 5% vol → monthly
    monthly_deflator = (1 + inflation_rate) ** (1 / 12)

    final_values = []
    successes = 0
    for _ in range(simulations):
        value = current_value
        for _ in range(months):
            r = random.gauss(monthly_return, monthly_std_dev)
            value = value * (1 + r) + monthly_sip
        final_values.append(value)
        if value >= real_target:
            successes += 1

    final_values.sort()
    median_corpus = final_values[len(final_values) // 2]
    # Deflate median back to today's rupees
    median_corpus_real = median_corpus / ((1 + inflation_rate) ** years)

    return {
        "probability_pct": round((successes / simulations) * 100, 1),
        "real_target": round(real_target, 0),
        "median_corpus": round(median_corpus, 0),
        "median_corpus_real": round(median_corpus_real, 0),
    }


def find_required_sip(
    current_value: float,
    target_amount: float,
    target_date: date,
    annual_return_rate: float = 0.12,
    inflation_rate: float = 0.06,
    target_probability: float = 80.0,
    simulations: int = 500,
) -> float:
    """
    Binary-search the monthly SIP that achieves target_probability% success.
    Returns the required monthly SIP in INR (rounded to nearest 100).
    """
    today = date.today()
    months = (target_date.year - today.year) * 12 + (target_date.month - today.month)
    if months <= 0:
        return 0.0

    lo, hi = 0.0, target_amount  # upper bound: saving entire target every month

    for _ in range(30):  # 30 iterations → precision within ₹1
        mid = (lo + hi) / 2
        result = monte_carlo_goal_probability(
            current_value=current_value,
            monthly_sip=mid,
            target_amount=target_amount,
            target_date=target_date,
            annual_return_rate=annual_return_rate,
            inflation_rate=inflation_rate,
            simulations=simulations,
        )
        if result["probability_pct"] >= target_probability:
            hi = mid
        else:
            lo = mid

    # Round to nearest ₹100
    return round((lo + hi) / 2 / 100) * 100
