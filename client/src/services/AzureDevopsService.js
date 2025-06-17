import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://10.95.108.11:5000',
});
const getPipelineLogs = async (runId) => {
  try {
    const res = await axiosInstance.get(`/azure-devops/logs/${runId}`);
    if (res?.status === 200) {
      return res.data;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getPipelineStatus = async (runId, templateName) => {
  try {
    const res = await axiosInstance.get(
      `/azure-devops/pipeline-status/${runId}/${templateName}`,
    );
    if (res?.status === 200) {
      return res.data;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export { getPipelineLogs, getPipelineStatus };
