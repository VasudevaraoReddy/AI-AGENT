import axios, { AxiosInstance, AxiosResponse } from "axios";

const axiosInstance: AxiosInstance = axios.create({
  baseURL: 'http://10.95.108.11:5000', // Add your base URL here
});

interface AzureRepoJsonResponse {
  [templateName: string]: string;
}

interface AzureReposResponse {
  status: number;
  files: AzureRepoJsonResponse;
}

const getAzureReposInJson = async (): Promise<AzureReposResponse | undefined> => {
  try {
    const res: AxiosResponse<AzureRepoJsonResponse> = await axiosInstance.get("/azure-devops/azure-repos-json");
    if (res?.status === 200) {
      return {
        status: 200,
        files: res.data,
      };
    }
  } catch (error) {
    console.error(error);
  }
};

const getPipelineRunHistory = async (): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await axiosInstance.get("/azure-devops/all-pipeline-runs");
    if (res?.status === 200) {
      return res.data;
    }
  } catch (error) {
    console.error(error);
  }
};

const getPipelineLogs = async (runId: string): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await axiosInstance.get(`/azure-devops/logs/${runId}`);
    if (res?.status === 200) {
      return res.data;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getPipelineStatus = async (
  runId: string,
  templateName: string
): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await axiosInstance.get(
      `/azure-devops/pipeline-status/${runId}/${templateName}`
    );
    if (res?.status === 200) {
      return res.data;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const updateJsonInDevOps = async (
  template: string,
  formValues: Record<string, any>,
  uuid: string,
  createdBy: string,
  stageToSkip: string
): Promise<any> => {
  try {
    const azureReposInJson = await getAzureReposInJson();
    if (azureReposInJson?.status === 200) {
      const filePath = azureReposInJson.files?.[template];
      const res: AxiosResponse<any> = await axiosInstance.post("/azure-devops/update-json-file", {
        filePath,
        data: formValues,
        comment: `JSON Updated by ${createdBy}`,
      });

      console.log(res);

      if (res.data?.status === 200) {
        return await triggerPipeline(
          filePath?.split("/")[2],
          uuid,
          createdBy,
          stageToSkip
        );
      }
    }
  } catch (error) {
    console.error(error);
  }
};

const triggerPipeline = async (
  template: string,
  uuid: string,
  createdBy: string,
  stageToSkip: string
): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await axiosInstance.post("/azure-devops/trigger-pipeline", {
      template,
      uuid,
      createdBy,
      stageToSkip,
    });
    if (res.status === 201) {
      return res.data;
    }
  } catch (error) {
    console.error(error);
  }
};

const getTerraformVariables = async (): Promise<any[] | { message: string; status: number }> => {
  try {
    const res: AxiosResponse<{ tfVariables: any[] }> = await axios.get(
      "http://10.95.108.11:4000/infra-provision-service/terraform_variables"
    );
    if (res.status === 200) {
      return res.data?.tfVariables;
    } else {
      return [];
    }
  } catch (error) {
    return {
      message: "Some thing went wrong",
      status: 404,
    };
  }
};

export {
  updateJsonInDevOps,
  triggerPipeline,
  getPipelineRunHistory,
  getPipelineLogs,
  getPipelineStatus,
  getAzureReposInJson,
  getTerraformVariables
};
