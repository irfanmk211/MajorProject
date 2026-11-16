from datetime import datetime, timedelta, timezone


AVERAGE_SAMPLE_COUNT = 5
AVERAGE_FIELDS = ("n", "p", "k", "temperature", "humidity", "moisture")
MAX_SAMPLE_GAP = timedelta(seconds=150)


def accumulate_periodic_sample(window, reading, sampled_at):
    """Add one periodic sensor sample and return a completed average when ready."""
    window = window if isinstance(window, dict) else {}
    last_sample_at = window.get("lastSampleAt")
    if isinstance(last_sample_at, datetime):
        if last_sample_at.tzinfo is None:
            last_sample_at = last_sample_at.replace(tzinfo=timezone.utc)
        if sampled_at - last_sample_at > MAX_SAMPLE_GAP:
            window = {}

    sample_count = int(window.get("sampleCount", 0)) + 1
    sums = dict(window.get("sums") or {})
    counts = dict(window.get("counts") or {})
    for field in AVERAGE_FIELDS:
        if field in reading:
            sums[field] = float(sums.get(field, 0)) + reading[field]
            counts[field] = int(counts.get(field, 0)) + 1

    if sample_count >= AVERAGE_SAMPLE_COUNT:
        averages = {
            field: sums[field] / counts[field]
            for field in AVERAGE_FIELDS
            if counts.get(field, 0)
        }
        return {"sampleCount": 0, "sums": {}, "counts": {}}, averages

    return {
        "sampleCount": sample_count,
        "sums": sums,
        "counts": counts,
        "lastSampleAt": sampled_at,
    }, None
