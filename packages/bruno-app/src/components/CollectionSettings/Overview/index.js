import { flattenItems } from "utils/collections/index";
import StyledWrapper from "./StyledWrapper";
import Docs from "../Docs/index";
import Info from "../Info/index";
import { IconBox, IconAlertTriangle } from '@tabler/icons';

const Overview = ({ collection }) => {
  const flattenedItems = flattenItems(collection.items);
  const itemsFailedLoading = flattenedItems?.filter(item => item?.partial && !item?.loading);
  return (
    <StyledWrapper className="flex flex-col h-full relative py-2 gap-4">
      <div className="flex flex-row grid grid-cols-5 w-full gap-8">
        <div className="col-span-2 flex flex-col">
          <div className="text-xl font-semibold flex items-center gap-2">
            <IconBox size={24} />
            {collection?.name}
          </div>
          <Info collection={collection} />
          {
            itemsFailedLoading?.length ? 
              <div className="w-full border border-opacity-50 border-yellow-500 rounded-md">
                <div className="my-2 mx-2 pb-2 font-medium">
                  Following requests were not loaded
                </div>
                <table className="w-full border-collapse mt-2">
                  <thead>
                    <tr>
                      <td>
                        <div className="ml-2">
                          Pathname
                        </div>
                      </td>
                      <td>
                        <div className="ml-2">
                          Size
                        </div>
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {flattenedItems?.map(item => (
                      <>
                        {
                          item?.partial && !item?.loading ?
                            <tr className="">
                              <td className="py-2 px-2">{item?.pathname?.split(`${collection?.pathname}/`)?.[1]}</td>
                              <td className="py-2 px-2 text-left">{item?.size?.toFixed?.(2)}&nbsp;MB</td>
                            </tr>
                            : null
                        }
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            :
              null
          }
        </div>
        <div className="col-span-3">
          <Docs collection={collection} />
        </div>
      </div>
    </StyledWrapper>
  );
}

export default Overview;