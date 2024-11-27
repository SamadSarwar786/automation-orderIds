const { Builder, By, Key, until } = require("selenium-webdriver");
const readline = require("readline");
const fs = require("fs").promises;

// Function to get OTP from the console
const getOtpFromConsole = () => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Enter OTP: ", (otp) => {
      rl.close();
      resolve(otp);
    });
  });
};

// Load order IDs (mock function, replace with actual loading logic)
// return ['OB129567029Z4M', 'OB130905525Z4M','OB131361279JS', 'OB131582111JS']; // Replace with actual order IDs
async function loadOrderIdsFromFile() {
  try {
    // Read the file contents
    const data = await fs.readFile("./orderList.txt", "utf8");

    // Split the file contents by line breaks to get an array of order IDs
    return data.split(/\r?\n/).filter((line) => line.trim() !== "");
  } catch (err) {
    console.error("Error reading order list file:", err);
    return [];
  }
}

(async function automate() {
  // Set up WebDriver
  const driver = await new Builder().forBrowser("chrome").build();
  try {
    // Navigate to the website
    await driver.get("https://agent.abhibus.com/index.php");

    // Enter username and password
    await driver.findElement(By.name("uname")).sendKeys("abhibus_aayushk");
    await driver
      .findElement(By.name("pword"))
      .sendKeys("Aayushjain@14", Key.RETURN);

    await driver.sleep(2 * 1000);

    const otpFieldPresent = await driver.wait(
      until.elementLocated(By.name("passcode")),
      2 * 1000
    );

    if (otpFieldPresent) {
      // OTP is required, proceed to enter OTP
      const otp = await getOtpFromConsole();
      await otpFieldPresent.sendKeys(otp, Key.RETURN);
    } else {
      // OTP was not required, proceed
      console.log("OTP not required, proceeding...");
    }
    // Wait for login process to complete (adapt sleep time as needed)
    await driver.sleep(1 * 1000);

    await driver.wait(until.elementLocated(By.linkText("ORDERS")), 20 * 1000);

    // Locate and click the "ORDERS" link
    const ordersLink = await driver.findElement(By.linkText("ORDERS"));
    await ordersLink.click();

    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return url.includes("AbrsOrdersList");
    }, 20 * 1000);

    // console.log(await driver.getPageSource());
    const orderIds = await loadOrderIdsFromFile();

    const countArr = [];
    const typeArr = [];
    for (const orderId of orderIds) {
      let inputField = await driver.findElement(By.name("trackid"));
      await inputField.clear();

      // Enter the new orderId into the input field
      await inputField.sendKeys(orderId);

      // Locate submit button and click
      await driver.findElement(By.name("Srchbtn")).click();

      await driver.wait(until.elementLocated(By.name("view_1")), 30 * 1000);

      await driver.findElement(By.name("view_1")).click();

      const checkForTextIn40thTbody = async () => {
        try {
          // Find all tbody elements

          const tbodyElements = await driver.findElements(By.tagName("tbody"));

          for (let i = 0; i < tbodyElements.length; i++) {
            const targetTbody = tbodyElements[i];

            // Check for text within this specific tbody
            const text = await targetTbody.getText();

            if (text.includes("Opted Free Cancelation")) {
              return "FC";
            } else if (text.includes("Opted Assured")) {
              return "ASRD ";
            }
            // Return "NA" if neither text is found
            return "NA";
          }
        } catch (error) {
          console.error("Error checking for text:", error);
          return "ERROR";
        }
      };

      const result = await checkForTextIn40thTbody();
      const viewRadioButtons = await driver.findElements(
        By.xpath('//input[starts-with(@name, "view_")]')
      );
      // Count the number of such elements
      const totalViews = viewRadioButtons.length;
      typeArr.push(result);
      countArr.push(totalViews);
    }

    await writeArrayToFile("./count_response.txt", countArr);
    await writeArrayToFile("./type_rsponse.txt", typeArr);

    await driver.sleep(1 * 1000);
  } finally {
    // Quit the driver
    await driver.quit();
  }
})();

async function writeArrayToFile(filePath, array) {
  try {
    // Join the array into a single string with newline separators
    const data = array.join("\n");

    // Write the string to the specified file
    await fs.writeFile(filePath, data, "utf8");

    console.log("Array of strings has been written to the file successfully.");
  } catch (err) {
    console.error("Error writing to file:", err);
  }
}
