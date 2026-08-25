"""Pydantic models shared across API routes."""
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(examples=["healthy"])
    service: str = Field(examples=["patho-ml-service"])
    version: str = Field(examples=["1.0.0"])
    modelLoaded: bool = Field(examples=[False])


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class ClassProbability(BaseModel):
    className: str
    classIndex: int = Field(ge=0)
    probability: float = Field(ge=0, le=1)


class PredictionPayload(BaseModel):
    predictedClass: str
    predictedIndex: int = Field(ge=0)
    confidence: float = Field(ge=0, le=1)
    uncertain: bool
    warning: str | None = None
    probabilities: list[ClassProbability]
    modelName: str
    modelVersion: str
    preprocessingVersion: str
    inferenceDurationMs: int = Field(ge=0)


class PredictionResponse(BaseModel):
    success: bool = True
    prediction: PredictionPayload
    disclaimer: str = "For research and educational use only. Not a medical diagnosis."
