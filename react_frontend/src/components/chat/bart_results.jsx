import React from 'react';

const BartResults = ({ result_rubrics, result_tags, messages }) => {
  return (
    <div>
      <div>
        <table border="1" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "60%" }}>Message</th> {/* Set message to 60% of the width */}
              {result_tags && result_tags.length > 0 && result_tags[0].results.map((tag, tagIndex) => (
                <th style={{ width: `${40 / result_tags[0].results.length}%` }} key={tagIndex}>{tag}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result_tags && result_tags.length > 0 && result_tags.map((messageData, index) => (
              index > 0 && ( // Skip the first row
                <tr key={index}>
                  <td style={{ width: "60%", whiteSpace: "normal" }}>{messageData.message}</td> {/* Ensure 60% width for message and allow wrapping */}
                  {messageData.results.map((result, resultIndex) => (
                    <td style={{ width: `${40 / messageData.results.length}%` }} key={resultIndex}>
                      {result === "N/A" ? "N/A" : (result > 0.5 ? "Yes" : "No")}
                    </td>
                  ))}
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BartResults;
