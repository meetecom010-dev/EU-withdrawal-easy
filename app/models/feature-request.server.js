import mongoose from "mongoose";

const { Schema } = mongoose;

// One document per "Request a feature" submission from Help & resources.
const featureRequestSchema = new Schema(
  {
    shop: { type: String, required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    request: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.models.FeatureRequest ??
  mongoose.model("FeatureRequest", featureRequestSchema);
