# AgroSmart AI Data Directory

This directory follows standard ML engineering practices to separate raw, intermediate, and processed datasets.

## Directory Structure

- **`raw/`**: Holds original, immutable data streams.
  - `soil/`: Raw IoT readings, soil sensor telemetry, and historical moisture records.
  - `weather/`: Raw API weather responses, temperature, humidity, and rainfall logs.
  - `crops/`: Standard agricultural databases mapping soil characteristics to crop yields.
  - `location/`: Geographic coordinates and spatial metadata mapping fields and regions.
  - `disease/`: Image sets of plant leaves used to train or evaluate disease recognition models.
- **`interim/`**: Intermediate, partially transformed data (e.g., rescaled features, converted timestamps, merged sensor reports).
- **`processed/`**: Cleaned, structured, and feature-engineered datasets that are ready to be fed into training algorithms.
- **`final/`**: Fixed datasets used for final model benchmarking, gold-standard evaluations, or production deployment records.
