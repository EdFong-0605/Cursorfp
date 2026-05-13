/** Black header band below the NavBar logo row; hosts the site search control. */
import './TopRibbon.css';
import SearchBar from '../2.1 SearchBar/SearchBar';

/**
 * @param {object} props — forwarded to SearchBar
 * @param {string} [props.placeholder]
 * @param {{ id: string, label: string }[]} [props.clients]
 * @param {(query: string, context: { clientId: string }) => void} [props.onSearch]
 */
function TopRibbon(props) {
  return (
    <div className="top-ribbon" role="presentation">
      <SearchBar {...props} />
    </div>
  );
}

export default TopRibbon;
